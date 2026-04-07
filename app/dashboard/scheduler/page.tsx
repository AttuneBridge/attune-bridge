import Link from "next/link";
import { AppModule, SchedulerOfferStatus, SchedulerRecipientSmsStatus } from "@prisma/client";
import { SchedulerWorkspace } from "@/components/forms/scheduler-workspace";
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

export default async function DashboardSchedulerPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const subscription = await getModuleSubscriptionForBusiness(workspace.businessId, AppModule.SCHEDULER);

  if (!subscription.isEnabled) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Last-Minute Scheduler Module</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Last-Minute Scheduler is not active yet</h1>
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
          <p className="text-sm text-slate-700">Activate this module to launch last-minute discounted appointment slots.</p>
          <p className="text-sm text-slate-600">Activated from Dashboard Home appears here immediately after enabling.</p>
          <Link href="/dashboard" className="text-sm font-medium text-slate-900 underline">
            Open subscription settings
          </Link>
        </Card>
      </main>
    );
  }

  const now = new Date();

  await prisma.schedulerOffer.updateMany({
    where: {
      businessId: workspace.businessId,
      status: SchedulerOfferStatus.SENT,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: SchedulerOfferStatus.EXPIRED,
      closedAt: now,
    },
  });

  const [contacts, offers] = await Promise.all([
    prisma.schedulerContact.findMany({
      where: {
        businessId: workspace.businessId,
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        notes: true,
        optedInAt: true,
        optedOutAt: true,
        optedOutReason: true,
        lastMessagedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.schedulerOffer.findMany({
      where: {
        businessId: workspace.businessId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
      include: {
        claimedByContact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        recipients: {
          select: {
            smsStatus: true,
          },
        },
      },
    }),
  ]);

  const offersForUi = offers.map((offer) => ({
    id: offer.id,
    serviceLabel: offer.serviceLabel,
    discountText: offer.discountText,
    startsAt: offer.startsAt,
    expiresAt: offer.expiresAt,
    status: offer.status,
    sentAt: offer.sentAt,
    claimedAt: offer.claimedAt,
    closedAt: offer.closedAt,
    createdAt: offer.createdAt,
    claimedByContact: offer.claimedByContact,
    recipientCount: offer.recipients.length,
    sentCount: offer.recipients.filter((recipient) => recipient.smsStatus === SchedulerRecipientSmsStatus.SENT).length,
    failedCount: offer.recipients.filter((recipient) => recipient.smsStatus === SchedulerRecipientSmsStatus.FAILED).length,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-4">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Last-Minute Scheduler Module</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Last-Minute Scheduler workspace</h1>
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
            Manage your priority queue, send discounted open slots by SMS, and let first-click claims auto-book the spot.
          </p>
        </Card>

        <SchedulerWorkspace
          businessId={workspace.businessId}
          initialContacts={contacts}
          initialOffers={offersForUi}
        />
      </div>
    </main>
  );
}
