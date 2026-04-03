import Link from "next/link";
import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { PublicHeaderNav } from "@/components/navigation/public-header-nav";
import { getEnabledModulesForBusiness } from "@/lib/module-subscriptions";
import { getOwnerSession } from "@/lib/owner-session";

type DashboardNavModule = "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ownerSession = await getOwnerSession();
  const enabledModules = ownerSession ? await getEnabledModulesForBusiness(ownerSession.businessId) : [];
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
          <PublicHeaderNav hasOwnerSession={Boolean(ownerSession)} />
        </div>
      </header>
      {ownerSession ? <DashboardNav enabledModules={dashboardNavModules} /> : null}
      {children}
    </>
  );
}
