import { NextResponse } from "next/server";
import { claimSchedulerOfferByToken } from "@/lib/scheduler/claim";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
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

    return NextResponse.json({ ok: true, result }, { status: 200 });
  }

  if (result.status === "invalid") {
    return NextResponse.json({ ok: false, result }, { status: 404 });
  }

  if (result.status === "already_claimed") {
    return NextResponse.json({ ok: false, result }, { status: 409 });
  }

  return NextResponse.json({ ok: false, result }, { status: 410 });
}
