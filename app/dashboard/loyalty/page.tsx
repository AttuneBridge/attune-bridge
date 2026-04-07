import Link from "next/link";
import {
  AppModule,
  FeedbackStatus,
  LoyaltyMessageStatus,
  LoyaltyPlaybookStatus,
  Sentiment,
} from "@prisma/client";
import { LoyaltyWorkspace } from "@/components/forms/loyalty-workspace";
import { Card } from "@/components/ui/card";
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

export default async function DashboardLoyaltyPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const subscription = await getModuleSubscriptionForBusiness(workspace.businessId, AppModule.LOYALTY);

  if (!subscription.isEnabled) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Loyalty Builder Module</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Loyalty Builder is not active yet</h1>
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
          <p className="text-sm text-slate-700">Activate this module to run repeat-visit offers and loyalty campaigns.</p>
          <Link href="/dashboard" className="text-sm font-medium text-slate-900 underline">
            Open subscription settings
          </Link>
        </Card>
      </main>
    );
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [playbooks, offers, templates, recoveryItems, activePlaybooks, pendingMessages, sentMessagesLast30Days, conversionsLast30Days] =
    await Promise.all([
      prisma.loyaltyPlaybook.findMany({
        where: {
          businessId: workspace.businessId,
        },
        include: {
          offer: {
            select: {
              id: true,
              name: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 12,
      }),
      prisma.loyaltyOffer.findMany({
        where: { businessId: workspace.businessId },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        take: 30,
      }),
      prisma.loyaltyTemplate.findMany({
        where: { businessId: workspace.businessId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 30,
      }),
      prisma.feedback.findMany({
        where: {
          location: {
            businessId: workspace.businessId,
          },
          sentiment: {
            in: [Sentiment.NEUTRAL, Sentiment.NEGATIVE],
          },
          status: {
            in: [FeedbackStatus.NEW, FeedbackStatus.IN_PROGRESS],
          },
        },
        select: {
          id: true,
          sentiment: true,
          status: true,
          customerName: true,
          customerEmail: true,
          message: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),
      prisma.loyaltyPlaybook.count({
        where: {
          businessId: workspace.businessId,
          status: LoyaltyPlaybookStatus.ACTIVE,
        },
      }),
      prisma.loyaltyMessage.count({
        where: {
          businessId: workspace.businessId,
          status: LoyaltyMessageStatus.PENDING,
        },
      }),
      prisma.loyaltyMessage.count({
        where: {
          businessId: workspace.businessId,
          status: LoyaltyMessageStatus.SENT,
          sentAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.loyaltyConversion.count({
        where: {
          businessId: workspace.businessId,
          convertedAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-4">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Loyalty Builder Module</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Loyalty Builder workspace</h1>
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
            Run simple return-visit playbooks so happy visits can lead to public reviews and repeat bookings.
          </p>
        </Card>

        <section className="grid gap-3 md:grid-cols-2">
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Active Playbooks</p>
            <p className="text-2xl font-semibold text-slate-900">{activePlaybooks}</p>
            <p className="text-xs text-slate-600">Automation flows currently running.</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pending Messages</p>
            <p className="text-2xl font-semibold text-slate-900">{pendingMessages}</p>
            <p className="text-xs text-slate-600">Queued loyalty sends waiting on delay windows.</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Messages Sent (30d)</p>
            <p className="text-2xl font-semibold text-slate-900">{sentMessagesLast30Days}</p>
            <p className="text-xs text-slate-600">Delivery volume from enabled playbooks.</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Conversions (30d)</p>
            <p className="text-2xl font-semibold text-slate-900">{conversionsLast30Days}</p>
            <p className="text-xs text-slate-600">Tracked review or booking outcomes.</p>
          </Card>
        </section>

        <LoyaltyWorkspace
          businessId={workspace.businessId}
          initialPlaybooks={playbooks.map((playbook) => ({
            id: playbook.id,
            name: playbook.name,
            status: playbook.status,
            type: playbook.type,
            audience: playbook.audience,
            trigger: playbook.trigger,
            delayHours: playbook.delayHours,
            offer: playbook.offer,
            template: playbook.template,
            messageCount: playbook._count.messages,
          }))}
          initialOffers={offers.map((offer) => ({
            id: offer.id,
            name: offer.name,
            kind: offer.kind,
            valueText: offer.valueText,
            isActive: offer.isActive,
          }))}
          initialTemplates={templates.map((template) => ({
            id: template.id,
            name: template.name,
            category: template.category,
            isDefault: template.isDefault,
          }))}
          initialRecoveryItems={recoveryItems.map((entry) => ({
            id: entry.id,
            status: entry.status,
            sentiment: entry.sentiment === Sentiment.NEGATIVE ? "NEGATIVE" : "NEUTRAL",
            customerName: entry.customerName,
            customerEmail: entry.customerEmail,
            message: entry.message,
            createdAt: entry.createdAt.toISOString(),
          }))}
        />

        <Card className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">How default loyalty routing works in v1</p>
          <p>
            These are the starting rules used to keep outreach safe and simple before you customize more playbooks.
          </p>
          <p>
            <span className="font-medium text-slate-900">Great feedback</span>: send a review ask while the visit is still fresh,
            then send a delayed comeback nudge.
          </p>
          <p>
            <span className="font-medium text-slate-900">Okay feedback</span>: skip the immediate review ask, send private
            follow-up with a comeback incentive.
          </p>
          <p>
            <span className="font-medium text-slate-900">Not good feedback</span>: service recovery first. No review ask until
            the item is resolved in Recovery Queue.
          </p>
          <p className="text-xs text-slate-600">
            Goal: protect customer trust, prevent bad-timing review requests, and still drive repeat visits.
          </p>
        </Card>
      </div>
    </main>
  );
}
