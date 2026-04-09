import Link from "next/link";
import { RecoveryOutcome, Sentiment } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { FeedbackInboxList } from "@/components/reviews/feedback-inbox-list";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";
import { validationEvent } from "@/lib/validation-events";

export default async function DashboardFeedbackInboxPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  const feedbackEntries = await prisma.feedback.findMany({
    where: {
      location: {
        businessId: workspace.businessId,
      },
    },
    include: {
      location: {
        include: {
          business: {
            select: {
              name: true,
            },
          },
        },
      },
      notificationEvents: {
        select: {
          channel: true,
          status: true,
          reason: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      },
      assignedMembership: {
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
  });

  const entryIds = feedbackEntries.map((entry) => entry.id);
  const reaskEvents = entryIds.length
    ? await prisma.validationEvent.findMany({
        where: {
          businessId: workspace.businessId,
          event: validationEvent.reviewsReaskSent,
        },
        select: {
          metadata: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];

  const latestReaskByFeedbackId = new Map<string, Date>();
  const entryIdSet = new Set(entryIds);
  for (const event of reaskEvents) {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;
    const feedbackId = typeof metadata?.feedbackId === "string" ? metadata.feedbackId : null;
    if (!feedbackId || !entryIdSet.has(feedbackId) || latestReaskByFeedbackId.has(feedbackId)) {
      continue;
    }

    latestReaskByFeedbackId.set(feedbackId, event.createdAt);
  }

  const nowMs = Date.now();
  const reaskEligibleCount = feedbackEntries.filter((entry) => {
    const isEligibleOutcome =
      (entry.sentiment === Sentiment.NEUTRAL || entry.sentiment === Sentiment.NEGATIVE) &&
      entry.status === "RESOLVED" &&
      entry.recoveryOutcome === RecoveryOutcome.SAVED &&
      entry.resolvedAt &&
      entry.resolvedAt.getTime() <= nowMs - 24 * 60 * 60 * 1000;

    return isEligibleOutcome && !latestReaskByFeedbackId.has(entry.id);
  }).length;

  const reaskSentCount = latestReaskByFeedbackId.size;

  const serializedEntries = feedbackEntries.map((entry) => ({
    id: entry.id,
    sentiment: entry.sentiment,
    status: entry.status,
    recoveryOutcome: entry.recoveryOutcome,
    createdAt: entry.createdAt.toISOString(),
    resolvedAt: entry.resolvedAt ? entry.resolvedAt.toISOString() : null,
    nextFollowUpAt: entry.nextFollowUpAt ? entry.nextFollowUpAt.toISOString() : null,
    assignedToEmail: entry.assignedMembership?.user.email ?? null,
    reviewReaskSentAt: latestReaskByFeedbackId.get(entry.id)?.toISOString() ?? null,
    message: entry.message,
    wantsFollowUp: entry.wantsFollowUp,
    followUpPreference: entry.followUpPreference,
    customerName: entry.customerName,
    customerEmail: entry.customerEmail,
    phone: entry.phone,
    location: {
      name: entry.location.name,
      business: {
        name: entry.location.business.name,
      },
    },
    notificationEvents: entry.notificationEvents.map((event) => ({
      channel: event.channel,
      status: event.status,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reviews Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Recent Private Feedback</h1>
          <p className="text-sm text-slate-600">Customer feedback inbox for {workspace.businessName}.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/feedback/${workspace.locationSlug}?returnTo=/dashboard/tools/reviews/feedback`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
          >
            Preview customer form
          </Link>
          <Link
            href="/dashboard/tools/reviews/qr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
          >
            Open business QR code
          </Link>
        </div>

        {feedbackEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-sm text-slate-700">
              No feedback yet. New submissions from your customer form will appear here.
            </p>
          </div>
        ) : (
          <FeedbackInboxList
            entries={serializedEntries}
            exportHref={`/api/businesses/${workspace.businessId}/reviews/sla-export?days=7`}
            reaskEligibleCount={reaskEligibleCount}
            reaskSentCount={reaskSentCount}
          />
        )}
      </Card>
    </main>
  );
}
