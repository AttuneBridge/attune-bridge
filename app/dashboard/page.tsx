import { AppModule, ModuleSubscriptionStatus, SubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { OwnerFeatureRequestPanel } from "@/components/dashboard/owner-feature-request-panel";
import { ModuleSubscriptionForm } from "@/components/forms/module-subscription-form";
import { RenewSubscriptionForm } from "@/components/forms/renew-subscription-form";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";
import { getDayDelta } from "@/lib/subscription-countdown";
import { evaluateBusinessAccess } from "@/lib/subscription-access";

const OWNER_MANAGED_MODULES: Array<Exclude<AppModule, "FEEDBACK">> = [
  AppModule.REVIEWS,
  AppModule.SCHEDULER,
  AppModule.LOYALTY,
  AppModule.MISSED_CALL_TEXTBACK,
];

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

export default async function DashboardHomePage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
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

      <OwnerFeatureRequestPanel
        businessId={workspace.businessId}
        businessEmail={business.email}
        requests={business.featureRequests.map((request) => ({
          id: request.id,
          ownerEmail: request.ownerEmail,
          details: request.details,
          module: request.module,
          createdAt: request.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
