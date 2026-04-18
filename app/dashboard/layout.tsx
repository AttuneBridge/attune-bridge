import Link from "next/link";
import { AppModule, BusinessMembershipRole, SystemRole } from "@prisma/client";
import { headers } from "next/headers";
import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { PublicHeaderNav } from "@/components/navigation/public-header-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { DemoModeBanner } from "@/components/ui/demo-mode-banner";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { isDemoModeAllowedForHost } from "@/lib/demo/config";
import { requireDashboardIdentity } from "@/lib/auth/require-dashboard-identity";
import { getEnabledModulesForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";

type DashboardNavModule = "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK";

function isSystemAdmin(role: SystemRole) {
  return role === SystemRole.SUPER_ADMIN || role === SystemRole.ADMIN;
}

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await requireDashboardIdentity("/dashboard");
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const isDemoMode = isDemoModeAllowedForHost(host);

  const ownerMembership = await prisma.businessMembership.findFirst({
    where: {
      userId: identity.userId,
      role: BusinessMembershipRole.OWNER,
    },
    select: {
      businessId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const fallbackBusiness =
    !ownerMembership && isSystemAdmin(identity.systemRole)
      ? await prisma.business.findFirst({
          select: { id: true },
          orderBy: { createdAt: "asc" },
        })
      : null;

  const businessId = ownerMembership?.businessId ?? fallbackBusiness?.id ?? null;

  const enabledModules = businessId
    ? await (async () => {
        try {
          return await getEnabledModulesForBusiness(businessId);
        } catch (error) {
          console.error("[dashboard-layout] module subscription lookup failed", error);
          return [AppModule.FEEDBACK] as AppModule[];
        }
      })()
    : [];

  if (!businessId) {
    redirectToDashboardAccess("/dashboard");
  }

  const dashboardNavModules: DashboardNavModule[] = Array.from(
    new Set(
      enabledModules.flatMap((module) => {
        if (module === "FEEDBACK") {
          return ["REVIEWS"];
        }

        return module;
      }),
    ),
  ).filter(
    (module): module is DashboardNavModule =>
      module === "REVIEWS" ||
      module === "SCHEDULER" ||
      module === "LOYALTY" ||
      module === "MISSED_CALL_TEXTBACK",
  );

  return (
    <>
      <header className="relative overflow-hidden border-b border-app-surface-muted bg-linear-to-r from-app-surface via-app-surface to-app-surface-muted/55">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-8 top-0 h-20 w-20 rounded-full bg-radial from-module-reviews-solid/14 to-module-reviews-solid/0" />
          <svg className="absolute -left-1 top-1 h-16 w-16 opacity-28 md:opacity-40 lg:opacity-56" viewBox="0 0 64 64" fill="none">
            <circle className="stroke-module-reviews-border/65" cx="32" cy="32" r="4" strokeWidth="1" />
            <circle className="stroke-module-reviews-border/65" cx="32" cy="32" r="8" strokeWidth="1" />
            <circle className="stroke-module-reviews-border/65" cx="32" cy="32" r="12" strokeWidth="1" />
            <circle className="stroke-module-reviews-border/65" cx="32" cy="32" r="16" strokeWidth="1" strokeDasharray="2 4" />
            <circle className="stroke-module-reviews-border/65" cx="32" cy="32" r="20" strokeWidth="1" strokeDasharray="2 5" />
            <circle className="stroke-module-reviews-border/65" cx="32" cy="32" r="24" strokeWidth="1" strokeDasharray="3 6" />
          </svg>
          <div className="absolute right-16 top-0 h-20 w-20 rounded-full bg-radial from-module-textback-border/30 to-module-textback-border/0" />
          <svg className="absolute right-4 bottom-1 h-8 w-24 opacity-30 md:opacity-42 lg:opacity-58" viewBox="0 0 96 32" fill="none">
            <path className="stroke-module-scheduler-border/55" d="M4 20c3-6 6-6 9 0s6 6 9 0 6-6 9 0 6 6 9 0 6-6 9 0 6 6 9 0 6-6 9 0 6 6 9 0 6-6 9 0" strokeWidth="1" />
            <circle className="stroke-module-scheduler-border/55" cx="76" cy="24" r="3" strokeWidth="1" />
          </svg>
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-app-text">
            AttuneBridge
          </Link>
          <PublicHeaderNav hasDashboardAccess />
        </div>
      </header>
      {isDemoMode ? <DemoModeBanner /> : null}
      <DashboardNav enabledModules={dashboardNavModules} />
      {children}
      <SiteFooter />
    </>
  );
}
