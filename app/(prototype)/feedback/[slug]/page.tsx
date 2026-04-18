import Link from "next/link";
import { StripeSubscriptionStatus } from "@prisma/client";
import { FeedbackExperience } from "@/components/forms/feedback-experience";
import { evaluateBillingAccess } from "@/lib/billing/access";
import { Card } from "@/components/ui/card";
import { getDayDelta } from "@/lib/subscription-countdown";
import { prisma } from "@/lib/prisma";

type FeedbackPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

function sanitizeReturnTo(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return null;
  }

  return trimmed;
}

export default async function FeedbackPage({ params, searchParams }: FeedbackPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const returnTo = sanitizeReturnTo(typeof query.returnTo === "string" ? query.returnTo : undefined);

  let location: {
    slug: string;
    name: string;
    googleReviewLink: string | null;
    yelpReviewLink: string | null;
    business: {
      name: string;
      stripeStatus: StripeSubscriptionStatus | null;
      stripeCurrentPeriodEnd: Date | null;
      stripeTrialEnd: Date | null;
    };
  } | null = null;

  try {
    location = await prisma.location.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        googleReviewLink: true,
        yelpReviewLink: true,
        business: {
          select: {
            name: true,
            stripeStatus: true,
            stripeCurrentPeriodEnd: true,
            stripeTrialEnd: true,
          },
        },
      },
    });
  } catch {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900">Demo data is not ready yet</h1>
          <p className="text-sm text-slate-600">
            This page needs a database connection and seeded demo records.
          </p>
          <p className="text-sm text-slate-600">
            Set <code>DATABASE_URL</code> in <code>.env</code>, then run migrations and seed.
          </p>
          <Link href="/" className="text-sm font-medium text-slate-900 underline">
            Go back to homepage
          </Link>
        </Card>
      </main>
    );
  }

  if (!location) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900">We could not find that feedback link</h1>
          <p className="text-sm text-slate-600">
            The page may have moved or the link may be incomplete.
          </p>
          <Link href="/" className="text-sm font-medium text-slate-900 underline">
            Go back to homepage
          </Link>
        </Card>
      </main>
    );
  }

  const access = evaluateBillingAccess({
    stripeStatus: location.business.stripeStatus,
  });

  const activeWindowEnd =
    location.business.stripeStatus === "ACTIVE"
      ? location.business.stripeCurrentPeriodEnd
      : location.business.stripeTrialEnd;
  const dayDelta = getDayDelta(activeWindowEnd);
  const isRecoverableExpired =
    !access.isActive && (access.reason === "canceled" || access.reason === "past_due");
  const isMissingSetup = !access.isActive && access.reason === "missing_subscription";
  const daysSinceExpiry = dayDelta === null ? null : Math.abs(Math.min(dayDelta, 0));

  if (!access.isActive) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900">This feedback form is temporarily unavailable</h1>
          {isMissingSetup ? (
            <p className="inline-flex w-fit rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
              Missing setup
            </p>
          ) : null}
          {isRecoverableExpired ? (
            <p className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              Expired but recoverable
            </p>
          ) : null}
          <p className="text-sm text-slate-600">
            {location.business.name} is not currently collecting feedback through this link.
          </p>
          {isRecoverableExpired && daysSinceExpiry !== null ? (
            <p className="text-sm text-slate-600">
              This link expired {daysSinceExpiry} day{daysSinceExpiry === 1 ? "" : "s"} ago and can be reactivated soon.
            </p>
          ) : null}
          {isMissingSetup ? (
            <p className="text-sm text-slate-600">
              This business account is still finishing setup. Please contact the owner for an updated feedback link.
            </p>
          ) : null}
          <p className="text-sm text-slate-600">Please contact the business directly for help.</p>
          <p className="text-xs text-slate-500">
            Business owner?{" "}
            <Link href="/access" className="font-medium text-slate-700 underline">
              Open dashboard access
            </Link>
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Customer Feedback
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            How was your experience with {location.business.name} - {location.name}?
          </h1>
          <p className="text-sm text-slate-600">
            This takes less than a minute and helps the team improve.
          </p>
          {returnTo ? (
            <Link href={returnTo} className="inline-flex text-sm font-medium text-slate-900 underline">
              Back to dashboard
            </Link>
          ) : null}
        </div>
        <FeedbackExperience
          slug={location.slug}
          businessName={location.business.name}
          locationName={location.name}
          googleReviewLink={location.googleReviewLink}
          yelpReviewLink={location.yelpReviewLink}
        />
      </Card>
    </main>
  );
}
