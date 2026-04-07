import Link from "next/link";
import { BusinessMembershipRole } from "@prisma/client";
import { OwnerWorkspaceNav } from "@/components/navigation/owner-workspace-nav";
import { getEnabledModulesForBusiness } from "@/lib/module-subscriptions";
import { PublicHeaderNav } from "@/components/navigation/public-header-nav";
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
      <header className="border-b border-app-surface-muted bg-app-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-app-text">
            AttuneBridge
          </Link>
          <PublicHeaderNav hasDashboardAccess={Boolean(membership)} />
        </div>
      </header>
      {membership ? <OwnerWorkspaceNav locationSlug="dashboard" enabledModules={enabledModules} /> : null}
      {children}
    </>
  );
}
