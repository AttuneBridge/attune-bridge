import { AppModule, SchedulerOfferStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type CloseOfferRequestBody = {
  manageToken?: unknown;
};

async function hasSchedulerAccess(businessId: string, manageToken?: string) {
  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return { ok: false as const, status: access.status, error: access.error };
  }

  const subscription = await getModuleSubscriptionForBusiness(businessId, AppModule.SCHEDULER);

  if (!subscription.isEnabled) {
    return { ok: false as const, status: 403, error: "Scheduler module is not active." };
  }

  return { ok: true as const };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string; offerId: string }> },
) {
  const { businessId, offerId } = await context.params;
  let body: CloseOfferRequestBody = {};

  try {
    body = (await request.json()) as CloseOfferRequestBody;
  } catch {
    body = {};
  }

  const access = await hasSchedulerAccess(
    businessId,
    typeof body.manageToken === "string" ? body.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const offer = await prisma.schedulerOffer.findFirst({
    where: {
      id: offerId,
      businessId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  if (offer.status === SchedulerOfferStatus.CLOSED || offer.status === SchedulerOfferStatus.CLAIMED) {
    return NextResponse.json({ ok: true, status: offer.status });
  }

  const updated = await prisma.schedulerOffer.update({
    where: { id: offer.id },
    data: {
      status: SchedulerOfferStatus.CLOSED,
      closedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      closedAt: true,
    },
  });

  await trackValidationEvent({
    event: validationEvent.schedulerOfferClosed,
    businessId,
    metadata: {
      offerId: updated.id,
      status: updated.status,
    },
  });

  return NextResponse.json({ ok: true, offer: updated });
}
