import Link from "next/link";
import { SubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { OwnerFeatureRequestForm } from "@/components/forms/owner-feature-request-form";
import { Card } from "@/components/ui/card";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";
import { getDayDelta } from "@/lib/subscription-countdown";
import { evaluateBusinessAccess } from "@/lib/subscription-access";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

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

export default async function DashboardReviewsPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  const location = await prisma.location.findFirst({
    where: {
      slug: workspace.locationSlug,
      businessId: workspace.businessId,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      business: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true,
          trialStartedAt: true,
          trialEndsAt: true,
          paidThrough: true,
          autoRenewEnabled: true,
          deactivatedAt: true,
          featureRequests: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              ownerEmail: true,
              details: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!location) {
    redirect("/dashboard/access");
  }

  const reviewsSubscription = await getModuleSubscriptionForBusiness(location.business.id, "REVIEWS");

  if (!reviewsSubscription.isEnabled) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reviews Module</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reviews is not active yet</h1>
          <p className="text-sm text-slate-700">
            Activate Reviews from Dashboard Home in Module subscriptions to re-open this workspace.
          </p>
          <Link href="/dashboard" className="text-sm font-medium text-slate-900 underline">
            Open Dashboard Home
          </Link>
        </Card>
      </main>
    );
  }

  const access = evaluateBusinessAccess({
    subscriptionStatus: location.business.subscriptionStatus,
    trialEndsAt: location.business.trialEndsAt,
    paidThrough: location.business.paidThrough,
    autoRenewEnabled: location.business.autoRenewEnabled,
    deactivatedAt: location.business.deactivatedAt,
  });

  const isMonthlySubscriptionActive =
    location.business.subscriptionStatus === SubscriptionStatus.ACTIVE_PAID &&
    location.business.autoRenewEnabled;
  const activeWindowEnd =
    location.business.subscriptionStatus === SubscriptionStatus.ACTIVE_PAID
      ? location.business.paidThrough
      : location.business.trialEndsAt;
  const dayDelta = getDayDelta(activeWindowEnd);
  const daysRemaining = dayDelta === null ? null : Math.max(dayDelta, 0);
  const daysSinceExpiry = dayDelta === null ? null : Math.abs(Math.min(dayDelta, 0));

  await trackValidationEvent({
    event: validationEvent.manageViewed,
    businessId: location.business.id,
    locationId: location.id,
    metadata: {
      source: "dashboard_reviews",
      subscriptionStatus: location.business.subscriptionStatus,
      accessReason: access.reason,
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reviews Workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{location.business.name}</h1>
            <p className="text-sm text-slate-600">Location: {location.name}</p>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Current status:</span>{" "}
              {getStatusLabel(location.business.subscriptionStatus)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Trial started:</span>{" "}
              {formatDate(location.business.trialStartedAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Trial ends:</span> {formatDate(location.business.trialEndsAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Paid through:</span> {formatDate(location.business.paidThrough)}
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

          <Link href="/dashboard" className="text-sm font-medium text-slate-900 underline">
            Manage billing and renewals in Dashboard Home
          </Link>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/feedback/${location.slug}`}
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open /feedback/{location.slug}
            </Link>
            <Link
              href="/dashboard/reviews/qr"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Open location QR code
            </Link>
            <Link
              href="/dashboard/reviews/feedback"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Open customer feedback inbox
            </Link>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">Customer feedback link</p>
            <p className="mt-1 break-all text-xs text-slate-600">/feedback/{location.slug}</p>
            <Link
              href={`/feedback/${location.slug}`}
              className="mt-2 inline-block text-sm font-medium text-slate-900 underline"
            >
              Preview customer form
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-900">Owner feature request</h3>
            <p className="mb-2 text-sm text-slate-700">
              Tell us what would make AttuneBridge more useful in your day-to-day workflow.
            </p>
            <OwnerFeatureRequestForm
              businessId={location.business.id}
            />
          </div>

          <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recent requests</p>
            {location.business.featureRequests.length === 0 ? (
              <p className="text-xs text-slate-600">No requests submitted yet.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-700">
                {location.business.featureRequests.map((request: {
                  id: string;
                  ownerEmail: string;
                  details: string;
                  createdAt: Date;
                }) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="font-medium text-slate-800">{new Date(request.createdAt).toLocaleString()}</p>
                    <p className="mt-1">{request.details}</p>
                    <p className="mt-1 text-slate-500">
                      Submitted by {request.ownerEmail === location.business.email ? "owner" : request.ownerEmail}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}
