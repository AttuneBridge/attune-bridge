import Link from "next/link";
import { AppModule } from "@prisma/client";
import { TextBackWorkspace } from "@/components/forms/textback-workspace";
import { Card } from "@/components/ui/card";
import { getAppUrl } from "@/lib/app-url";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  INACTIVE: "Inactive",
} as const;

const STATUS_CLASSES = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  TRIAL: "border-sky-200 bg-sky-50 text-sky-800",
  INACTIVE: "border-slate-300 bg-slate-100 text-slate-700",
} as const;

const DEFAULT_AUTO_REPLY = "Hey - sorry we missed your call. How can we help?";

export default async function DashboardTextBackPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const subscription = await getModuleSubscriptionForBusiness(workspace.businessId, AppModule.MISSED_CALL_TEXTBACK);

  if (!subscription.isEnabled) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Missed Call Text Back Module</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Missed Call Text Back is not active yet</h1>
            <Link
              href="/dashboard"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
          <p>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[subscription.status]}`}
            >
              Status: {STATUS_LABELS[subscription.status]}
            </span>
          </p>
          <p className="text-sm text-slate-700">Activate this module to auto-text missed callers and recover lost leads.</p>
          <Link href="/dashboard" className="text-sm font-medium text-slate-900 underline">
            Open subscription settings
          </Link>
        </Card>
      </main>
    );
  }

  const [config, business, events] = await Promise.all([
    prisma.missedCallConfig.findUnique({
      where: { businessId: workspace.businessId },
      select: {
        twilioPhone: true,
        autoReplyMessage: true,
        isActive: true,
      },
    }),
    prisma.business.findUnique({
      where: { id: workspace.businessId },
      select: { alertPhone: true },
    }),
    prisma.missedCallEvent.findMany({
      where: { businessId: workspace.businessId },
      select: {
        id: true,
        callerPhone: true,
        smsStatus: true,
        errorMessage: true,
        createdAt: true,
        replyForwardedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-4">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Missed Call Text Back Module</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Missed Call Text Back workspace</h1>
            <Link
              href="/dashboard"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
          <p>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[subscription.status]}`}
            >
              Status: {STATUS_LABELS[subscription.status]}
            </span>
          </p>
          <p className="text-sm text-slate-700">
            If a call is missed, your caller gets an instant text and any reply can be forwarded to your phone.
          </p>
        </Card>

        <TextBackWorkspace
          businessId={workspace.businessId}
          initialTwilioPhone={config?.twilioPhone ?? ""}
          initialAutoReplyMessage={config?.autoReplyMessage ?? DEFAULT_AUTO_REPLY}
          initialIsActive={config?.isActive ?? true}
          initialReplyForwardPhone={business?.alertPhone ?? ""}
          webhookBaseUrl={getAppUrl()}
          initialEvents={events.map((event: (typeof events)[number]) => ({
            id: event.id,
            callerPhone: event.callerPhone,
            smsStatus: event.smsStatus,
            errorMessage: event.errorMessage,
            createdAtIso: event.createdAt.toISOString(),
            replyForwardedAtIso: event.replyForwardedAt ? event.replyForwardedAt.toISOString() : null,
          }))}
        />
      </div>
    </main>
  );
}
