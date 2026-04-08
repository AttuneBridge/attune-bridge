import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";

export default async function DashboardToolsPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Tools Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Execution tools for {workspace.businessName}</h1>
          <p className="text-sm text-slate-700">Open a focused tool route from this workspace-specific launcher.</p>
        </Card>

        <section className="grid gap-3 md:grid-cols-2">
          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Reviews Workspace</p>
            <p className="text-sm text-slate-700">Feedback inbox, recovery outcomes, SLA queue, and review re-ask workflow.</p>
            <Link href="/dashboard/tools/reviews" className="text-sm font-medium text-slate-900 underline">
              Open Reviews tool
            </Link>
          </Card>

          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Scheduler Workspace</p>
            <p className="text-sm text-slate-700">Launch and manage last-minute offers and contact outreach.</p>
            <Link href="/dashboard/tools/scheduler" className="text-sm font-medium text-slate-900 underline">
              Open Scheduler tool
            </Link>
          </Card>

          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Loyalty Workspace</p>
            <p className="text-sm text-slate-700">Manage offers, templates, playbooks, and loyalty recovery items.</p>
            <Link href="/dashboard/tools/loyalty" className="text-sm font-medium text-slate-900 underline">
              Open Loyalty tool
            </Link>
          </Card>

          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Missed Call Text Back</p>
            <p className="text-sm text-slate-700">Configure auto-replies and handle missed-call response queue.</p>
            <Link href="/dashboard/tools/textback" className="text-sm font-medium text-slate-900 underline">
              Open Text Back tool
            </Link>
          </Card>

          <Card className="space-y-2 md:col-span-2">
            <p className="text-sm font-semibold text-slate-900">Contacts Workspace</p>
            <p className="text-sm text-slate-700">Sync cross-module contacts and manage consent/channel preferences.</p>
            <Link href="/dashboard/tools/contacts" className="text-sm font-medium text-slate-900 underline">
              Open Contacts tool
            </Link>
          </Card>
        </section>
      </div>
    </main>
  );
}
