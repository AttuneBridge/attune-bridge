import Link from "next/link";
import { BusinessMembershipRole } from "@prisma/client";
import { headers } from "next/headers";
import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { PublicHeaderNav } from "@/components/navigation/public-header-nav";
import { DemoModeBanner } from "@/components/ui/demo-mode-banner";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { isDemoModeAllowedForHost } from "@/lib/demo/config";
import { requireDashboardIdentity } from "@/lib/auth/require-dashboard-identity";
import { getEnabledModulesForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";

type DashboardNavModule = "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await requireDashboardIdentity("/dashboard");
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const isDemoMode = isDemoModeAllowedForHost(host);

  const businessId = (
    await prisma.businessMembership.findFirst({
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
    })
  )?.businessId;

  const enabledModules = businessId ? await getEnabledModulesForBusiness(businessId) : [];

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
      <header className="border-b border-app-surface-muted bg-app-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-app-text">
            AttuneBridge
          </Link>
          <PublicHeaderNav hasDashboardAccess />
        </div>
      </header>
      {isDemoMode ? <DemoModeBanner /> : null}
      <DashboardNav enabledModules={dashboardNavModules} />
      {children}
    </>
  );
}
