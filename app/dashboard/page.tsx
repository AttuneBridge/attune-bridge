import {
  AppModule,
  FeedbackStatus,
  LoyaltyConversionType,
  ModuleSubscriptionStatus,
  RecoveryOutcome,
  Sentiment,
  SubscriptionStatus,
} from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnerFeatureRequestPanel } from "@/components/dashboard/owner-feature-request-panel";
import { ModuleSubscriptionForm } from "@/components/forms/module-subscription-form";
import { RenewSubscriptionForm } from "@/components/forms/renew-subscription-form";
import { Card } from "@/components/ui/card";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";
import { getDayDelta } from "@/lib/subscription-countdown";
import { evaluateBusinessAccess } from "@/lib/subscription-access";
import { validationEvent } from "@/lib/validation-events";

const OWNER_MANAGED_MODULES: Array<Exclude<AppModule, "FEEDBACK">> = [
  AppModule.REVIEWS,
  AppModule.SCHEDULER,
  AppModule.LOYALTY,
  AppModule.MISSED_CALL_TEXTBACK,
];

type RoiWindowMetrics = {
  feedbackCollected: number;
  privateCases: number;
  resolvedPrivateCases: number;
  recoveredCustomers: number;
  unresolvedPrivateCases: number;
  schedulerClaims: number;
  missedCallReplies: number;
  reviewRedirects: number;
  loyaltyBookingConversions: number;
  loyaltyReviewConversions: number;
  savedRatePercent: number;
  conversionProxyTotal: number;
};

function formatDate(date: Date | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type RoiDelta = {
  feedbackCollected: number;
  recoveredCustomers: number;
  savedRatePercent: number;
  reviewRedirects: number;
  conversionProxyTotal: number;
};

type InstrumentationStep = {
  label: string;
  eventName: string;
  count: number;
};

type ModuleFunnel = {
  module: string;
  steps: InstrumentationStep[];
};

type ReliabilityStats = {
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  total: number;
  failedRatePercent: number;
};

type DeadLetterItem = {
  id: string;
  module: string;
  channel: string;
  status: string;
  reason: string;
  occurredAt: Date;
};

type PricingExperimentSummary = {
  winbackAccepted: number;
  cancelsWithReason: number;
  cancelReasons: Array<{ reason: string; count: number }>;
};

async function withFallback<T>(label: string, action: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.error(`[dashboard] ${label} failed`, error);
    return fallback;
  }
}

type OnboardingChecklistItem = {
  label: string;
  complete: boolean;
  hint: string;
  href: string;
};

function getStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.TRIAL_ACTIVE:
      return "Trial";
    case SubscriptionStatus.ACTIVE_PAID:
      return "Paid";
    case SubscriptionStatus.INACTIVE_EXPIRED:
      return "Expired";
    case SubscriptionStatus.INACTIVE_CANCELED:
      return "Canceled";
    default:
      return "Unknown";
  }
}

function getPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function buildDateRangeFilter(start: Date, end: Date) {
  return {
    gte: start,
    lt: end,
  };
}

function getRoiDelta(current: RoiWindowMetrics, previous: RoiWindowMetrics): RoiDelta {
  return {
    feedbackCollected: current.feedbackCollected - previous.feedbackCollected,
    recoveredCustomers: current.recoveredCustomers - previous.recoveredCustomers,
    savedRatePercent: current.savedRatePercent - previous.savedRatePercent,
    reviewRedirects: current.reviewRedirects - previous.reviewRedirects,
    conversionProxyTotal: current.conversionProxyTotal - previous.conversionProxyTotal,
  };
}

function formatDeltaLabel(value: number, suffix = "") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

function getDeltaClass(value: number) {
  if (value > 0) {
    return "text-emerald-700";
  }

  if (value < 0) {
    return "text-rose-700";
  }

  return "text-slate-500";
}

function buildReliabilityStats(counts: { sent: number; failed: number; skipped: number; pending: number }): ReliabilityStats {
  const total = counts.sent + counts.failed + counts.skipped + counts.pending;

  return {
    ...counts,
    total,
    failedRatePercent: total === 0 ? 0 : Math.round((counts.failed / total) * 100),
  };
}

function formatReliabilityRate(value: number) {
  return `${value}%`;
}

function getEventCount(countMap: Map<string, number>, eventName: string) {
  return countMap.get(eventName) ?? 0;
}

function buildModuleFunnels(countMap: Map<string, number>): ModuleFunnel[] {
  return [
    {
      module: "Reviews",
      steps: [
        { label: "Feedback submitted", eventName: validationEvent.feedbackSubmitted, count: getEventCount(countMap, validationEvent.feedbackSubmitted) },
        { label: "Review redirects opened", eventName: validationEvent.reviewRedirectOpened, count: getEventCount(countMap, validationEvent.reviewRedirectOpened) },
        { label: "Case status updates", eventName: validationEvent.reviewsCaseStatusUpdated, count: getEventCount(countMap, validationEvent.reviewsCaseStatusUpdated) },
        { label: "Recovery outcome updates", eventName: validationEvent.reviewsRecoveryOutcomeUpdated, count: getEventCount(countMap, validationEvent.reviewsRecoveryOutcomeUpdated) },
        { label: "Recovery playbooks applied", eventName: validationEvent.reviewsRecoveryPlaybookApplied, count: getEventCount(countMap, validationEvent.reviewsRecoveryPlaybookApplied) },
      ],
    },
    {
      module: "Scheduler",
      steps: [
        { label: "Contacts added", eventName: validationEvent.schedulerContactAdded, count: getEventCount(countMap, validationEvent.schedulerContactAdded) },
        { label: "Offers sent", eventName: validationEvent.schedulerOfferSent, count: getEventCount(countMap, validationEvent.schedulerOfferSent) },
        { label: "Offers claimed", eventName: validationEvent.schedulerOfferClaimed, count: getEventCount(countMap, validationEvent.schedulerOfferClaimed) },
      ],
    },
    {
      module: "Loyalty",
      steps: [
        { label: "Messages queued", eventName: validationEvent.loyaltyMessagesQueued, count: getEventCount(countMap, validationEvent.loyaltyMessagesQueued) },
        { label: "Messages processed", eventName: validationEvent.loyaltyMessagesProcessed, count: getEventCount(countMap, validationEvent.loyaltyMessagesProcessed) },
        { label: "Recovery resolutions", eventName: validationEvent.loyaltyRecoveryResolved, count: getEventCount(countMap, validationEvent.loyaltyRecoveryResolved) },
      ],
    },
    {
      module: "Missed Call Text Back",
      steps: [
        { label: "Auto-replies sent", eventName: validationEvent.missedCallAutoReplySent, count: getEventCount(countMap, validationEvent.missedCallAutoReplySent) },
        { label: "Replies forwarded", eventName: validationEvent.missedCallReplyForwarded, count: getEventCount(countMap, validationEvent.missedCallReplyForwarded) },
      ],
    },
  ];
}

async function getRoiWindowMetrics(businessId: string, start: Date, end: Date): Promise<RoiWindowMetrics> {
  const dateRange = buildDateRangeFilter(start, end);
  const [
    feedbackCollected,
    privateCases,
    resolvedPrivateCases,
    recoveredCustomers,
    schedulerClaims,
    missedCallReplies,
    reviewRedirects,
    loyaltyBookingConversions,
    loyaltyReviewConversions,
  ] = await withFallback(
    "roi-window-metrics",
    () =>
      prisma.$transaction([
        prisma.feedback.count({
          where: {
            location: { businessId },
            createdAt: dateRange,
          },
        }),
        prisma.feedback.count({
          where: {
            location: { businessId },
            sentiment: { in: [Sentiment.NEUTRAL, Sentiment.NEGATIVE] },
            createdAt: dateRange,
          },
        }),
        prisma.feedback.count({
          where: {
            location: { businessId },
            sentiment: { in: [Sentiment.NEUTRAL, Sentiment.NEGATIVE] },
            status: FeedbackStatus.RESOLVED,
            resolvedAt: dateRange,
          },
        }),
        prisma.feedback.count({
          where: {
            location: { businessId },
            sentiment: { in: [Sentiment.NEUTRAL, Sentiment.NEGATIVE] },
            recoveryOutcome: RecoveryOutcome.SAVED,
            resolvedAt: dateRange,
          },
        }),
        prisma.schedulerOffer.count({
          where: {
            businessId,
            claimedAt: dateRange,
          },
        }),
        prisma.missedCallEvent.count({
          where: {
            businessId,
            replyForwardedAt: dateRange,
          },
        }),
        prisma.validationEvent.count({
          where: {
            businessId,
            event: validationEvent.reviewRedirectOpened,
            createdAt: dateRange,
          },
        }),
        prisma.loyaltyConversion.count({
          where: {
            businessId,
            type: LoyaltyConversionType.BOOKING,
            convertedAt: dateRange,
          },
        }),
        prisma.loyaltyConversion.count({
          where: {
            businessId,
            type: LoyaltyConversionType.REVIEW,
            convertedAt: dateRange,
          },
        }),
      ]),
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  );

  return {
    feedbackCollected,
    privateCases,
    resolvedPrivateCases,
    recoveredCustomers,
    unresolvedPrivateCases: Math.max(privateCases - resolvedPrivateCases, 0),
    schedulerClaims,
    missedCallReplies,
    reviewRedirects,
    loyaltyBookingConversions,
    loyaltyReviewConversions,
    savedRatePercent: getPercent(recoveredCustomers, resolvedPrivateCases),
    conversionProxyTotal:
      recoveredCustomers +
      schedulerClaims +
      missedCallReplies +
      loyaltyBookingConversions +
      loyaltyReviewConversions,
  };
}

export default async function DashboardHomePage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const identity = await getRequestIdentity();
  const viewerEmail = identity?.email?.toLowerCase() ?? null;
  const business = await prisma.business.findUnique({
    where: { id: workspace.businessId },
    select: {
      id: true,
      subscriptionStatus: true,
      trialStartedAt: true,
      trialEndsAt: true,
      paidThrough: true,
      autoRenewEnabled: true,
      deactivatedAt: true,
      email: true,
      featureRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          ownerEmail: true,
          details: true,
          module: true,
          status: true,
          votes: {
            where: {
              ownerEmail: viewerEmail ?? "__no_dashboard_owner__",
            },
            select: {
              id: true,
            },
            take: 1,
          },
          _count: {
            select: {
              votes: true,
            },
          },
          createdAt: true,
        },
      },
    },
  });

  if (!business) {
    redirect("/dashboard/access");
  }

  const subscriptions = await prisma.businessModuleSubscription.findMany({
    where: {
      businessId: workspace.businessId,
      module: { in: OWNER_MANAGED_MODULES },
    },
    select: {
      module: true,
      status: true,
      startedAt: true,
      endsAt: true,
    },
    orderBy: {
      module: "asc",
    },
  });

  const moduleSubscriptionsForForm = OWNER_MANAGED_MODULES.map((module) => {
    const existing = subscriptions.find(
      (subscription: {
        module: AppModule;
        status: ModuleSubscriptionStatus;
        startedAt: Date | null;
        endsAt: Date | null;
      }) => subscription.module === module,
    );

    if (existing) {
      return {
        module,
        status: existing.status,
        startedAt: existing.startedAt,
        endsAt: existing.endsAt,
      };
    }

    return {
      module,
      status: ModuleSubscriptionStatus.INACTIVE,
      startedAt: null,
      endsAt: null,
    };
  });

  const enabledModuleCount = moduleSubscriptionsForForm.filter(
    (entry) => entry.status === ModuleSubscriptionStatus.ACTIVE || entry.status === ModuleSubscriptionStatus.TRIAL,
  ).length;

  const recommendedBundleLabel =
    enabledModuleCount <= 1
      ? "Growth Bundle: Reviews + Scheduler + Missed Call Text Back"
      : enabledModuleCount === 2
        ? "Momentum Bundle: Add Loyalty Builder"
        : "Full Revenue Bundle: Keep all modules active";

  const access = evaluateBusinessAccess({
    subscriptionStatus: business.subscriptionStatus,
    trialEndsAt: business.trialEndsAt,
    paidThrough: business.paidThrough,
    autoRenewEnabled: business.autoRenewEnabled,
    deactivatedAt: business.deactivatedAt,
  });

  const isMonthlySubscriptionActive =
    business.subscriptionStatus === SubscriptionStatus.ACTIVE_PAID && business.autoRenewEnabled;
  const activeWindowEnd =
    business.subscriptionStatus === SubscriptionStatus.ACTIVE_PAID
      ? business.paidThrough
      : business.trialEndsAt;
  const dayDelta = getDayDelta(activeWindowEnd);
  const daysRemaining = dayDelta === null ? null : Math.max(dayDelta, 0);
  const daysSinceExpiry = dayDelta === null ? null : Math.abs(Math.min(dayDelta, 0));

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const period7Start = new Date(now - 7 * dayMs);
  const period30Start = new Date(now - 30 * dayMs);
  const previous7Start = new Date(now - 14 * dayMs);
  const previous30Start = new Date(now - 60 * dayMs);
  const nowDate = new Date(now);

  const [roi7d, roi30d, previousRoi7d, previousRoi30d] = await Promise.all([
    getRoiWindowMetrics(workspace.businessId, period7Start, nowDate),
    getRoiWindowMetrics(workspace.businessId, period30Start, nowDate),
    getRoiWindowMetrics(workspace.businessId, previous7Start, period7Start),
    getRoiWindowMetrics(workspace.businessId, previous30Start, period30Start),
  ]);

  const roi7dDelta = getRoiDelta(roi7d, previousRoi7d);
  const roi30dDelta = getRoiDelta(roi30d, previousRoi30d);

  const [
    primaryLocation,
    feedbackSubmittedCount,
    feedbackResolvedCount,
    followUpScheduledCount,
    schedulerOffersSentCount,
    loyaltyMessagesSentCount,
    missedCallSentCount,
  ] = await withFallback(
    "onboarding-metrics",
    () =>
      Promise.all([
        prisma.location.findUnique({
          where: { slug: workspace.locationSlug },
          select: {
            id: true,
            googleReviewLink: true,
            yelpReviewLink: true,
          },
        }),
        prisma.feedback.count({
          where: {
            location: { businessId: workspace.businessId },
          },
        }),
        prisma.feedback.count({
          where: {
            location: { businessId: workspace.businessId },
            status: FeedbackStatus.RESOLVED,
          },
        }),
        prisma.feedback.count({
          where: {
            location: { businessId: workspace.businessId },
            nextFollowUpAt: { not: null },
          },
        }),
        prisma.schedulerOffer.count({
          where: {
            businessId: workspace.businessId,
            status: { in: ["SENT", "CLAIMED", "CLOSED", "EXPIRED"] },
          },
        }),
        prisma.loyaltyMessage.count({
          where: {
            businessId: workspace.businessId,
            status: "SENT",
          },
        }),
        prisma.missedCallEvent.count({
          where: {
            businessId: workspace.businessId,
            smsStatus: "SENT",
          },
        }),
      ]),
    [null, 0, 0, 0, 0, 0, 0],
  );

  const hasPublicReviewLink = Boolean(primaryLocation?.googleReviewLink || primaryLocation?.yelpReviewLink);
  const hasOutboundActivity = schedulerOffersSentCount > 0 || loyaltyMessagesSentCount > 0 || missedCallSentCount > 0;

  const onboardingChecklist: OnboardingChecklistItem[] = [
    {
      label: "Configure at least one public review link",
      complete: hasPublicReviewLink,
      hint: hasPublicReviewLink ? "Review links are live." : "Add Google or Yelp review link for redirect tracking.",
      href: "/dashboard/reviews/qr",
    },
    {
      label: "Capture first private feedback",
      complete: feedbackSubmittedCount > 0,
      hint: feedbackSubmittedCount > 0 ? `${feedbackSubmittedCount} feedback submissions captured.` : "Share your QR or feedback link to start intake.",
      href: "/dashboard/reviews/feedback",
    },
    {
      label: "Resolve first private case",
      complete: feedbackResolvedCount > 0,
      hint: feedbackResolvedCount > 0 ? `${feedbackResolvedCount} cases marked resolved.` : "Use outcome tracking to close your first case.",
      href: "/dashboard/reviews/feedback",
    },
    {
      label: "Schedule at least one follow-up reminder",
      complete: followUpScheduledCount > 0,
      hint: followUpScheduledCount > 0 ? `${followUpScheduledCount} cases have follow-up reminders.` : "Set 24h/48h reminders on unresolved cases.",
      href: "/dashboard/reviews/feedback",
    },
    {
      label: "Trigger first outbound recovery workflow",
      complete: hasOutboundActivity,
      hint: hasOutboundActivity
        ? `Scheduler sent: ${schedulerOffersSentCount}, Loyalty sent: ${loyaltyMessagesSentCount}, Missed-call sent: ${missedCallSentCount}`
        : "Send a scheduler offer, loyalty message, or missed-call auto-reply.",
      href: "/dashboard/scheduler",
    },
  ];

  const completedOnboardingItems = onboardingChecklist.filter((item) => item.complete).length;
  const onboardingProgressPercent = Math.round((completedOnboardingItems / onboardingChecklist.length) * 100);

  const instrumentationEvents = [
    validationEvent.feedbackSubmitted,
    validationEvent.reviewRedirectOpened,
    validationEvent.reviewsCaseStatusUpdated,
    validationEvent.reviewsRecoveryPlaybookApplied,
    validationEvent.reviewsRecoveryOutcomeUpdated,
    validationEvent.schedulerContactAdded,
    validationEvent.schedulerOfferSent,
    validationEvent.schedulerOfferClaimed,
    validationEvent.loyaltyMessagesQueued,
    validationEvent.loyaltyMessagesProcessed,
    validationEvent.loyaltyRecoveryResolved,
    validationEvent.missedCallAutoReplySent,
    validationEvent.missedCallReplyForwarded,
  ] as const;

  const instrumentationGrouped = await withFallback(
    "instrumentation-grouped",
    () =>
      prisma.validationEvent.groupBy({
        by: ["event"],
        where: {
          businessId: workspace.businessId,
          createdAt: { gte: period7Start, lt: nowDate },
          event: { in: [...instrumentationEvents] },
        },
        _count: {
          _all: true,
        },
      }),
    [],
  );

  const instrumentationCountMap = new Map<string, number>(
    instrumentationGrouped.map((entry) => [entry.event, entry._count._all]),
  );
  const moduleFunnels = buildModuleFunnels(instrumentationCountMap);

  const [
    notificationStatusCounts,
    schedulerRecipientStatusCounts,
    loyaltyMessageStatusCounts,
    missedCallStatusCounts,
    pendingLoyaltyMessages,
    pendingSchedulerRecipients,
    pendingMissedCallAutoReplies,
    recentNotificationFailures,
    recentSchedulerFailures,
    recentLoyaltyFailures,
    recentMissedCallFailures,
  ] = await withFallback(
    "reliability-metrics",
    () =>
      Promise.all([
        prisma.notificationEvent.groupBy({
      by: ["status"],
      where: {
        businessId: workspace.businessId,
        createdAt: { gte: period7Start, lt: nowDate },
      },
      _count: { _all: true },
    }),
    prisma.schedulerOfferRecipient.groupBy({
      by: ["smsStatus"],
      where: {
        offer: { businessId: workspace.businessId },
        createdAt: { gte: period7Start, lt: nowDate },
      },
      _count: { _all: true },
    }),
    prisma.loyaltyMessage.groupBy({
      by: ["status"],
      where: {
        businessId: workspace.businessId,
        createdAt: { gte: period7Start, lt: nowDate },
      },
      _count: { _all: true },
    }),
    prisma.missedCallEvent.groupBy({
      by: ["smsStatus"],
      where: {
        businessId: workspace.businessId,
        createdAt: { gte: period7Start, lt: nowDate },
      },
      _count: { _all: true },
    }),
    prisma.loyaltyMessage.count({
      where: {
        businessId: workspace.businessId,
        status: "PENDING",
        sendAfter: { lte: nowDate },
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
    prisma.notificationEvent.findMany({
      where: {
        businessId: workspace.businessId,
        createdAt: { gte: period7Start, lt: nowDate },
        status: { in: ["FAILED", "SKIPPED"] },
      },
      select: {
        id: true,
        channel: true,
        status: true,
        errorMessage: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.schedulerOfferRecipient.findMany({
      where: {
        offer: { businessId: workspace.businessId },
        createdAt: { gte: period7Start, lt: nowDate },
        smsStatus: { in: ["FAILED", "SKIPPED"] },
      },
      select: {
        id: true,
        smsStatus: true,
        smsErrorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.loyaltyMessage.findMany({
      where: {
        businessId: workspace.businessId,
        createdAt: { gte: period7Start, lt: nowDate },
        status: { in: ["FAILED", "SKIPPED", "CANCELED"] },
      },
      select: {
        id: true,
        channel: true,
        status: true,
        errorMessage: true,
        skipReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
        prisma.missedCallEvent.findMany({
      where: {
        businessId: workspace.businessId,
        createdAt: { gte: period7Start, lt: nowDate },
        smsStatus: { in: ["FAILED", "SKIPPED"] },
      },
      select: {
        id: true,
        smsStatus: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
        }),
      ]),
    [[], [], [], [], 0, 0, 0, [], [], [], []],
  );

  const notificationCountMap = new Map<string, number>(
    notificationStatusCounts.map((entry) => [entry.status, entry._count._all]),
  );
  const schedulerCountMap = new Map<string, number>(
    schedulerRecipientStatusCounts.map((entry) => [entry.smsStatus, entry._count._all]),
  );
  const loyaltyCountMap = new Map<string, number>(
    loyaltyMessageStatusCounts.map((entry) => [entry.status, entry._count._all]),
  );
  const missedCallCountMap = new Map<string, number>(
    missedCallStatusCounts.map((entry) => [entry.smsStatus, entry._count._all]),
  );

  const reliabilityByModule = [
    {
      module: "Reviews alerts",
      stats: buildReliabilityStats({
        sent: notificationCountMap.get("SENT") ?? 0,
        failed: notificationCountMap.get("FAILED") ?? 0,
        skipped: notificationCountMap.get("SKIPPED") ?? 0,
        pending: 0,
      }),
    },
    {
      module: "Scheduler SMS",
      stats: buildReliabilityStats({
        sent: schedulerCountMap.get("SENT") ?? 0,
        failed: schedulerCountMap.get("FAILED") ?? 0,
        skipped: schedulerCountMap.get("SKIPPED") ?? 0,
        pending: schedulerCountMap.get("PENDING") ?? 0,
      }),
    },
    {
      module: "Loyalty messages",
      stats: buildReliabilityStats({
        sent: loyaltyCountMap.get("SENT") ?? 0,
        failed: loyaltyCountMap.get("FAILED") ?? 0,
        skipped: loyaltyCountMap.get("SKIPPED") ?? 0,
        pending: loyaltyCountMap.get("PENDING") ?? 0,
      }),
    },
    {
      module: "Missed-call auto replies",
      stats: buildReliabilityStats({
        sent: missedCallCountMap.get("SENT") ?? 0,
        failed: missedCallCountMap.get("FAILED") ?? 0,
        skipped: missedCallCountMap.get("SKIPPED") ?? 0,
        pending: missedCallCountMap.get("PENDING") ?? 0,
      }),
    },
  ];

  const retryQueueSummary = {
    loyaltyPending: pendingLoyaltyMessages,
    schedulerPending: pendingSchedulerRecipients,
    missedCallPending: pendingMissedCallAutoReplies,
    totalPending: pendingLoyaltyMessages + pendingSchedulerRecipients + pendingMissedCallAutoReplies,
  };

  const deadLetterItems: DeadLetterItem[] = [
    ...recentNotificationFailures.map((entry) => ({
      id: entry.id,
      module: "Reviews alerts",
      channel: entry.channel,
      status: entry.status,
      reason: entry.errorMessage ?? entry.reason ?? "No reason provided",
      occurredAt: entry.createdAt,
    })),
    ...recentSchedulerFailures.map((entry) => ({
      id: entry.id,
      module: "Scheduler SMS",
      channel: "SMS",
      status: entry.smsStatus,
      reason: entry.smsErrorMessage ?? "No reason provided",
      occurredAt: entry.createdAt,
    })),
    ...recentLoyaltyFailures.map((entry) => ({
      id: entry.id,
      module: "Loyalty messages",
      channel: entry.channel,
      status: entry.status,
      reason: entry.errorMessage ?? entry.skipReason ?? "No reason provided",
      occurredAt: entry.createdAt,
    })),
    ...recentMissedCallFailures.map((entry) => ({
      id: entry.id,
      module: "Missed-call auto replies",
      channel: "SMS",
      status: entry.smsStatus,
      reason: entry.errorMessage ?? "No reason provided",
      occurredAt: entry.createdAt,
    })),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 12);

  const [winbackAccepted, cancelReasonEvents] = await withFallback(
    "pricing-experiments",
    () =>
      Promise.all([
        prisma.validationEvent.count({
      where: {
        businessId: workspace.businessId,
        event: validationEvent.subscriptionWinbackAccepted,
        createdAt: { gte: period30Start, lt: nowDate },
      },
        }),
        prisma.validationEvent.findMany({
      where: {
        businessId: workspace.businessId,
        event: validationEvent.subscriptionCancelReasonCaptured,
        createdAt: { gte: period30Start, lt: nowDate },
      },
      select: {
        metadata: true,
      },
      take: 200,
        }),
      ]),
    [0, []],
  );

  const cancelReasonCountMap = new Map<string, number>();
  for (const event of cancelReasonEvents) {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;
    const reason = typeof metadata?.cancelReason === "string" ? metadata.cancelReason : "UNKNOWN";
    cancelReasonCountMap.set(reason, (cancelReasonCountMap.get(reason) ?? 0) + 1);
  }

  const pricingExperimentSummary: PricingExperimentSummary = {
    winbackAccepted,
    cancelsWithReason: cancelReasonEvents.length,
    cancelReasons: [...cancelReasonCountMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-stretch">
        <Card className="flex h-full flex-col space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Dashboard Home</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back, {workspace.businessName}</h1>
          <p className="text-sm text-slate-700">
            One place to manage reviews, missed call text-backs, last-minute scheduling offers, and loyalty builder workflows.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Location:</span> {workspace.locationName}
            </p>
            <p>
              <span className="font-medium text-slate-900">Slug:</span> {workspace.locationSlug}
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Current status:</span>{" "}
              {getStatusLabel(business.subscriptionStatus)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Trial started:</span>{" "}
              {formatDate(business.trialStartedAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Trial ends:</span> {formatDate(business.trialEndsAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Paid through:</span> {formatDate(business.paidThrough)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Feedback form access:</span>{" "}
              {access.isActive ? "Active" : "Inactive"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Monthly subscription:</span>{" "}
              {isMonthlySubscriptionActive ? "Active" : "Not active"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Days remaining:</span>{" "}
              {daysRemaining !== null
                ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
                : "Not available"}
            </p>
            {!access.isActive && daysSinceExpiry !== null ? (
              <p>
                <span className="font-medium text-slate-900">Expired:</span> {daysSinceExpiry} day
                {daysSinceExpiry === 1 ? "" : "s"} ago
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Renewal details</h2>
            <p className="text-sm text-slate-700">
              Starting a monthly subscription activates your feedback form right away.
            </p>
            <p className="text-sm text-slate-700">Monthly subscriptions stay active until you cancel.</p>
            <p className="text-sm text-slate-700">
              Use the same owner email you signed up with to start or cancel your monthly subscription.
            </p>
            <RenewSubscriptionForm
              businessId={workspace.businessId}
              isMonthlySubscriptionActive={isMonthlySubscriptionActive}
            />
          </div>
        </Card>

        <Card className="flex h-full flex-col space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Module subscriptions</h2>
          <p className="text-sm text-slate-700">
            Turn on Missed Call Text Back, Last-Minute Scheduler, and Loyalty Builder as your workflow expands.
          </p>
          <ModuleSubscriptionForm businessId={workspace.businessId} moduleSubscriptions={moduleSubscriptionsForForm} />
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Pricing experiments</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Packaging + win-back learning loop</h2>
            <p className="text-sm text-slate-700">
              Track cancellation reasons, win-back acceptance, and module bundle recommendations over the last 30 days.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Recommended bundle:</span> {recommendedBundleLabel}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Recommendation adapts to currently active modules to encourage expansion without overwhelming setup.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Win-back accepted (30d)</p>
              <p className="text-2xl font-semibold text-slate-900">{pricingExperimentSummary.winbackAccepted}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Cancels with reason (30d)</p>
              <p className="text-2xl font-semibold text-slate-900">{pricingExperimentSummary.cancelsWithReason}</p>
            </Card>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Top cancel reasons</p>
            {pricingExperimentSummary.cancelReasons.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No cancellation reason responses yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {pricingExperimentSummary.cancelReasons.map((entry) => (
                  <span
                    key={entry.reason}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700"
                  >
                    {entry.reason.replace(/_/g, " ").toLowerCase()}: {entry.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Onboarding hardening</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Activation checklist + first value path</h2>
            <p className="text-sm text-slate-700">
              Complete setup milestones to shorten time-to-first-value for your owner workspace.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                Checklist progress: {completedOnboardingItems}/{onboardingChecklist.length}
              </p>
              <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                {onboardingProgressPercent}% complete
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-slate-700 transition-all"
                style={{ width: `${Math.max(onboardingProgressPercent, 4)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {onboardingChecklist.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      item.complete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.complete ? "Complete" : "Pending"}
                  </span>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.hint}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Link href="/dashboard/reviews/feedback" className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 hover:bg-slate-50">
              <span className="font-medium text-slate-900">Step 1:</span> Capture first feedback
            </Link>
            <Link href="/dashboard/reviews/feedback" className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 hover:bg-slate-50">
              <span className="font-medium text-slate-900">Step 2:</span> Resolve first case
            </Link>
            <Link href="/dashboard/scheduler" className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 hover:bg-slate-50">
              <span className="font-medium text-slate-900">Step 3:</span> Trigger first outbound flow
            </Link>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">ROI Dashboard v1</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Recovery and conversion signals</h2>
            <p className="text-sm text-slate-700">
              Early ROI view across Reviews, Scheduler, Loyalty, and Missed Call Text Back activity.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                label: "Last 7 days",
                previousLabel: "vs prior 7 days",
                metrics: roi7d,
                delta: roi7dDelta,
              },
              {
                label: "Last 30 days",
                previousLabel: "vs prior 30 days",
                metrics: roi30d,
                delta: roi30dDelta,
              },
            ].map((window) => (
              <div key={window.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{window.label}</p>
                <p className="text-xs text-slate-500">{window.previousLabel}</p>
                <div className="mt-2 grid gap-2 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Feedback captured:</span> {window.metrics.feedbackCollected}
                    <span className={`ml-2 text-xs ${getDeltaClass(window.delta.feedbackCollected)}`}>
                      ({formatDeltaLabel(window.delta.feedbackCollected)})
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Private cases:</span> {window.metrics.privateCases}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Resolved private cases:</span> {window.metrics.resolvedPrivateCases}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Recovered customers (Saved):</span>{" "}
                    {window.metrics.recoveredCustomers}
                    <span className={`ml-2 text-xs ${getDeltaClass(window.delta.recoveredCustomers)}`}>
                      ({formatDeltaLabel(window.delta.recoveredCustomers)})
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Saved rate:</span> {window.metrics.savedRatePercent}%
                    <span className={`ml-2 text-xs ${getDeltaClass(window.delta.savedRatePercent)}`}>
                      ({formatDeltaLabel(window.delta.savedRatePercent, "pp")})
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Open private cases:</span>{" "}
                    {window.metrics.unresolvedPrivateCases}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Scheduler claims:</span> {window.metrics.schedulerClaims}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Missed-call replies recovered:</span>{" "}
                    {window.metrics.missedCallReplies}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Review redirects opened:</span>{" "}
                    {window.metrics.reviewRedirects}
                    <span className={`ml-2 text-xs ${getDeltaClass(window.delta.reviewRedirects)}`}>
                      ({formatDeltaLabel(window.delta.reviewRedirects)})
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Loyalty booking conversions:</span>{" "}
                    {window.metrics.loyaltyBookingConversions}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Loyalty review conversions:</span>{" "}
                    {window.metrics.loyaltyReviewConversions}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Conversion proxy total:</span>{" "}
                    {window.metrics.conversionProxyTotal}
                    <span className={`ml-2 text-xs ${getDeltaClass(window.delta.conversionProxyTotal)}`}>
                      ({formatDeltaLabel(window.delta.conversionProxyTotal)})
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Conversion proxy = saved recoveries + scheduler claims + missed-call replies + loyalty booking conversions + loyalty review conversions.
            Review redirects are tracked explicitly from customer feedback flow.
          </p>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Instrumentation Baseline</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Module funnel event coverage (last 7 days)</h2>
            <p className="text-sm text-slate-700">
              Canonical event taxonomy for measuring module adoption and funnel movement.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {moduleFunnels.map((funnel) => (
              <div key={funnel.module} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{funnel.module}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {funnel.steps.map((step) => (
                    <p key={step.eventName}>
                      <span className="font-medium text-slate-900">{step.label}:</span> {step.count}
                      <span className="ml-2 text-xs text-slate-500">({step.eventName})</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reliability Guardrails v1</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Delivery health and dead-letter visibility (last 7 days)</h2>
            <p className="text-sm text-slate-700">
              Track failed/skipped sends by module and keep overdue pending messages visible for follow-up.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {reliabilityByModule.map((row) => (
              <div key={row.module} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{row.module}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      row.stats.failedRatePercent > 2
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Failed rate {formatReliabilityRate(row.stats.failedRatePercent)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Sent:</span> {row.stats.sent}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Failed:</span> {row.stats.failed}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Skipped:</span> {row.stats.skipped}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Pending:</span> {row.stats.pending}
                  </p>
                  <p className="col-span-2">
                    <span className="font-medium text-slate-900">Total events:</span> {row.stats.total}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Retry queue snapshot</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
              <p>
                <span className="font-medium text-slate-900">Loyalty pending:</span> {retryQueueSummary.loyaltyPending}
              </p>
              <p>
                <span className="font-medium text-slate-900">Scheduler pending:</span> {retryQueueSummary.schedulerPending}
              </p>
              <p>
                <span className="font-medium text-slate-900">Missed-call pending:</span> {retryQueueSummary.missedCallPending}
              </p>
              <p className="md:col-span-3">
                <span className="font-medium text-slate-900">Total pending:</span> {retryQueueSummary.totalPending}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Dead-letter recent failures</p>
            {deadLetterItems.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No failed or skipped sends recorded in the last 7 days.</p>
            ) : (
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                {deadLetterItems.map((item) => (
                  <div key={`${item.module}-${item.id}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{item.module}</span>
                      <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs">{item.channel}</span>
                      <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs">{item.status}</span>
                      <span className="text-xs text-slate-500">{item.occurredAt.toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>

      <OwnerFeatureRequestPanel
        businessId={workspace.businessId}
        businessEmail={business.email}
        requests={business.featureRequests.map((request) => ({
          id: request.id,
          ownerEmail: request.ownerEmail,
          details: request.details,
          module: request.module,
          status: request.status,
          hasUpvoted: request.votes.length > 0,
          upvoteCount: request._count.votes,
          createdAt: request.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
