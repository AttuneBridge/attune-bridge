import {
  AppModule,
  FeedbackStatus,
  LoyaltyConversionType,
  ModuleSubscriptionStatus,
  RecoveryOutcome,
  Sentiment,
  SubscriptionStatus,
} from "@prisma/client";
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
  ] = await prisma.$transaction([
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
  ]);

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

  const instrumentationEvents = [
    validationEvent.feedbackSubmitted,
    validationEvent.reviewRedirectOpened,
    validationEvent.reviewsCaseStatusUpdated,
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

  const instrumentationGrouped = await prisma.validationEvent.groupBy({
    by: ["event"],
    where: {
      businessId: workspace.businessId,
      createdAt: { gte: period7Start, lt: nowDate },
      event: { in: [...instrumentationEvents] },
    },
    _count: {
      _all: true,
    },
  });

  const instrumentationCountMap = new Map<string, number>(
    instrumentationGrouped.map((entry) => [entry.event, entry._count._all]),
  );
  const moduleFunnels = buildModuleFunnels(instrumentationCountMap);

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
