import Link from "next/link";
import { ContactConsentStatus } from "@prisma/client";
import { ContactConsentTable } from "@/components/forms/contact-consent-table";
import { ContactSyncButton } from "@/components/forms/contact-sync-button";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

export default async function DashboardContactsPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  const [contacts, consentCounts] = await Promise.all([
    prisma.contactProfile.findMany({
      where: { businessId: workspace.businessId },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
    }),
    prisma.contactProfile.groupBy({
      by: ["consentStatus"],
      where: { businessId: workspace.businessId },
      _count: {
        _all: true,
      },
    }),
  ]);

  const consentMap = new Map<ContactConsentStatus, number>(
    consentCounts.map((entry) => [entry.consentStatus, entry._count._all]),
  );

  const optedIn = consentMap.get(ContactConsentStatus.OPTED_IN) ?? 0;
  const optedOut = consentMap.get(ContactConsentStatus.OPTED_OUT) ?? 0;
  const unknown = consentMap.get(ContactConsentStatus.UNKNOWN) ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-4">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Contacts Workspace</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Unified contacts and consent controls</h1>
            <Link
              href="/dashboard"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
          <p className="text-sm text-slate-700">
            Manage opt-in status, preferred channel, and quiet hours in one place across Reviews, Scheduler, Loyalty, and Missed Call Text Back.
          </p>
          <ContactSyncButton businessId={workspace.businessId} />
        </Card>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Contacts (Loaded)</p>
            <p className="text-2xl font-semibold text-slate-900">{contacts.length}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Opted In</p>
            <p className="text-2xl font-semibold text-emerald-700">{optedIn}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Opted Out / Unknown</p>
            <p className="text-2xl font-semibold text-slate-900">{optedOut + unknown}</p>
          </Card>
        </section>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Contact records</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-600">No contacts yet. Run contact sync to build your unified contact list.</p>
          ) : (
            <ContactConsentTable
              businessId={workspace.businessId}
              contacts={contacts.map((entry) => ({
                id: entry.id,
                fullName: entry.fullName,
                email: entry.email,
                phone: entry.phone,
                source: entry.source,
                consentStatus: entry.consentStatus,
                channelPreference: entry.channelPreference,
                quietHoursStart: entry.quietHoursStart,
                quietHoursEnd: entry.quietHoursEnd,
                updatedAtIso: entry.updatedAt.toISOString(),
              }))}
            />
          )}
        </Card>
      </div>
    </main>
  );
}
