import Link from "next/link";
import { BusinessMembershipRole } from "@prisma/client";
import { OwnerWorkspaceNav } from "@/components/navigation/owner-workspace-nav";
import { getEnabledModulesForBusiness } from "@/lib/module-subscriptions";
import { PublicHeaderNav } from "@/components/navigation/public-header-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

export default async function PrototypeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await getRequestIdentity();
  const membership = identity
    ? await prisma.businessMembership.findFirst({
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
    : null;

  const enabledModules = membership ? await getEnabledModulesForBusiness(membership.businessId) : [];

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
          <PublicHeaderNav hasDashboardAccess={Boolean(membership)} />
        </div>
      </header>
      {membership ? <OwnerWorkspaceNav locationSlug="dashboard" enabledModules={enabledModules} /> : null}
      {children}
      <SiteFooter />
    </>
  );
}
