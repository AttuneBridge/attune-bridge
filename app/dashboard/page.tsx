import Link from "next/link";
import { FeedbackStatus, SubscriptionStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return value.toLocaleDateString();
}

function getSubscriptionLabel(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.ACTIVE_PAID:
      return "Active Paid";
    case SubscriptionStatus.TRIAL_ACTIVE:
      return "Trial Active";
    case SubscriptionStatus.INACTIVE_EXPIRED:
      return "Inactive (Expired)";
    case SubscriptionStatus.INACTIVE_CANCELED:
      return "Canceled";
    default:
      return "Unknown";
  }
}

export default async function DashboardHomePage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const now = new Date();

  const [business, openCases, overdueFollowUps, reaskReady, pendingLoyalty, pendingScheduler, pendingMissedCall] =
    await Promise.all([
      prisma.business.findUnique({
        where: { id: workspace.businessId },
        select: {
          name: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          paidThrough: true,
          autoRenewEnabled: true,
        },
      }),
      prisma.feedback.count({
        where: {
          location: { businessId: workspace.businessId },
          status: { in: [FeedbackStatus.NEW, FeedbackStatus.IN_PROGRESS] },
        },
      }),
      prisma.feedback.count({
        where: {
          location: { businessId: workspace.businessId },
          status: { in: [FeedbackStatus.NEW, FeedbackStatus.IN_PROGRESS] },
          nextFollowUpAt: {
            lte: now,
          },
        },
      }),
      prisma.feedback.count({
        where: {
          location: { businessId: workspace.businessId },
          status: FeedbackStatus.RESOLVED,
          recoveryOutcome: "SAVED",
          resolvedAt: {
            lte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.loyaltyMessage.count({
        where: {
          businessId: workspace.businessId,
          status: "PENDING",
        },
      }),
      prisma.schedulerOfferRecipient.count({
        where: {
          offer: { businessId: workspace.businessId },
          smsStatus: "PENDING",
        },
      }),
      prisma.missedCallEvent.count({
        where: {
          businessId: workspace.businessId,
          smsStatus: "PENDING",
        },
      }),
    ]);

  const pendingQueueTotal = pendingLoyalty + pendingScheduler + pendingMissedCall;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-5">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Owner Home</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back, {workspace.businessName}</h1>
          <p className="text-sm text-slate-700">
            Focused command center: use Tools for execution, Insights for analytics, and Settings for billing and module controls.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Business:</span> {business?.name ?? workspace.businessName}
              </p>
              <p>
                <span className="font-medium text-slate-900">Location:</span> {workspace.locationName}
              </p>
              <p>
                <span className="font-medium text-slate-900">Subscription:</span>{" "}
                {business ? getSubscriptionLabel(business.subscriptionStatus) : "Unknown"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Trial ends:</span> {formatDate(business?.trialEndsAt ?? null)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Paid through:</span> {formatDate(business?.paidThrough ?? null)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Today&apos;s priority queue</p>
              <p className="mt-1">Open private cases: {openCases}</p>
              <p>Overdue follow-ups: {overdueFollowUps}</p>
              <p>Recovered cases ready for re-ask: {reaskReady}</p>
              <p>Pending message queue: {pendingQueueTotal}</p>
            </div>
          </div>
        </Card>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tools</p>
            <p className="text-sm text-slate-700">Run reviews, scheduler, loyalty, text-back, and contacts workflows.</p>
            <Link href="/dashboard/tools" className="text-sm font-medium text-slate-900 underline">
              Open Tools workspace
            </Link>
          </Card>

          <Card className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Insights</p>
            <p className="text-sm text-slate-700">Track ROI, reliability, and reputation outcomes in one view.</p>
            <Link href="/dashboard/insights" className="text-sm font-medium text-slate-900 underline">
              Open Insights
            </Link>
          </Card>

          <Card className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Settings</p>
            <p className="text-sm text-slate-700">Manage subscription, module access, and configuration controls.</p>
            <Link href="/dashboard/settings" className="text-sm font-medium text-slate-900 underline">
              Open Settings
            </Link>
          </Card>
        </section>
      </div>
    </main>
  );
}
