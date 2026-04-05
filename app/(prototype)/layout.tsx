import Link from "next/link";
import { OwnerWorkspaceNav } from "@/components/navigation/owner-workspace-nav";
import { getEnabledModulesForBusiness } from "@/lib/module-subscriptions";
import { PublicHeaderNav } from "@/components/navigation/public-header-nav";
import { getOwnerSession } from "@/lib/owner-session";

export default async function PrototypeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ownerSession = await getOwnerSession();
  const enabledModules = ownerSession
    ? await getEnabledModulesForBusiness(ownerSession.businessId)
    : [];

  return (
    <>
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
            AttuneBridge
          </Link>
          <PublicHeaderNav hasDashboardAccess={Boolean(ownerSession)} hasLegacyOwnerSession={Boolean(ownerSession)} />
        </div>
      </header>
      {ownerSession ? (
        <OwnerWorkspaceNav locationSlug={ownerSession.locationSlug} enabledModules={enabledModules} />
      ) : null}
      {children}
    </>
  );
}
