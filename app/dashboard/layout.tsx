import Link from "next/link";
import { BusinessMembershipRole } from "@prisma/client";
import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { PublicHeaderNav } from "@/components/navigation/public-header-nav";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { requireDashboardIdentity } from "@/lib/auth/require-dashboard-identity";
import { getEnabledModulesForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";

type DashboardNavModule = "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await requireDashboardIdentity("/dashboard");

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
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
            AttuneBridge
          </Link>
          <PublicHeaderNav hasDashboardAccess />
        </div>
      </header>
      <DashboardNav enabledModules={dashboardNavModules} />
      {children}
    </>
  );
}
