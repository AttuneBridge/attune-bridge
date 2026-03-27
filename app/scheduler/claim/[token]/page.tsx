import Link from "next/link";
import { Card } from "@/components/ui/card";
import { claimSchedulerOfferByToken } from "@/lib/scheduler/claim";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type SchedulerClaimPageProps = {
  params: Promise<{ token: string }>;
};

function formatDateTime(value?: Date) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function SchedulerClaimPage({ params }: SchedulerClaimPageProps) {
  const { token } = await params;
  const result = await claimSchedulerOfferByToken(token);

  if (result.status === "claimed") {
    await trackValidationEvent({
      event: validationEvent.schedulerOfferClaimed,
      businessId: result.businessId,
      metadata: {
        offerId: result.offerId,
        serviceLabel: result.serviceLabel,
      },
    });
  }

  const title =
    result.status === "claimed"
      ? "You got the spot"
      : result.status === "already_claimed"
        ? "This slot was already claimed"
        : result.status === "expired"
          ? "This offer expired"
          : result.status === "closed"
            ? "This offer is closed"
            : "Offer link invalid";

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 md:py-16">
      <Card className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Last-Minute Offer</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>

        {result.businessName ? (
          <p className="text-sm text-slate-700">
            {result.businessName} - {result.serviceLabel}
          </p>
        ) : null}

        {result.startsAt ? (
          <p className="text-sm text-slate-700">Appointment time: {formatDateTime(result.startsAt)}</p>
        ) : null}

        {result.status === "claimed" ? (
          <>
            <p className="text-sm text-slate-700">
              Your claim is confirmed. The business will contact you shortly to finalize details.
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {result.discountText}
            </div>
          </>
        ) : null}

        {result.status === "already_claimed" ? (
          <p className="text-sm text-slate-700">
            Another customer claimed this opening first
            {result.claimedByName ? ` (${result.claimedByName})` : ""}.
          </p>
        ) : null}

        {result.status === "invalid" ? (
          <p className="text-sm text-slate-700">Please check your text link or contact the business directly.</p>
        ) : null}

        <Link href="/" className="text-sm font-medium text-slate-900 underline">
          Go to AttuneBridge home
        </Link>
      </Card>
    </main>
  );
}
