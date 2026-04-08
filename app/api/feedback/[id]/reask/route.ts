import { BusinessMembershipRole, RecoveryOutcome, Sentiment } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type ReaskBody = {
  channel?: unknown;
};

const allowedChannels = new Set(["SMS", "EMAIL"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getRequestIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const body = (await request.json().catch(() => null)) as ReaskBody | null;
  const channel = typeof body?.channel === "string" ? body.channel.trim().toUpperCase() : "";

  if (!allowedChannels.has(channel)) {
    return NextResponse.json({ error: "Channel must be SMS or EMAIL." }, { status: 400 });
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      locationId: true,
      sentiment: true,
      status: true,
      recoveryOutcome: true,
      resolvedAt: true,
      location: {
        select: {
          businessId: true,
        },
      },
    },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  const membership = await prisma.businessMembership.findFirst({
    where: {
      businessId: feedback.location.businessId,
      userId: identity.userId,
      role: BusinessMembershipRole.OWNER,
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (
    feedback.status !== "RESOLVED" ||
    feedback.recoveryOutcome !== RecoveryOutcome.SAVED ||
    (feedback.sentiment !== Sentiment.NEGATIVE && feedback.sentiment !== Sentiment.NEUTRAL)
  ) {
    return NextResponse.json({ error: "Case is not eligible for review re-ask." }, { status: 400 });
  }

  if (!feedback.resolvedAt || feedback.resolvedAt.getTime() > Date.now() - 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Re-ask is available 24h after resolution." }, { status: 400 });
  }

  await trackValidationEvent({
    event: validationEvent.reviewsReaskSent,
    businessId: feedback.location.businessId,
    locationId: feedback.locationId,
    metadata: {
      feedbackId: feedback.id,
      channel,
    },
  });

  return NextResponse.json({ ok: true });
}
