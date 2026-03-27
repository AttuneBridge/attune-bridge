import {
  FeedbackStatus,
  LoyaltyPlaybookStatus,
  LoyaltyMessageStatus,
  LoyaltyTemplateCategory,
  LoyaltyTrigger,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type ResolveRecoveryRequestBody = {
  delayHours?: unknown;
  manageToken?: unknown;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string; feedbackId: string }> },
) {
  const { businessId, feedbackId } = await context.params;
  let body: ResolveRecoveryRequestBody;

  try {
    body = (await request.json()) as ResolveRecoveryRequestBody;
  } catch {
    body = {};
  }

  const access = await getLoyaltyAccessResult(
    businessId,
    typeof body.manageToken === "string" ? body.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const feedback = await prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      location: {
        businessId,
      },
    },
    select: {
      id: true,
      locationId: true,
      status: true,
      customerName: true,
      customerEmail: true,
    },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  const delayRaw = typeof body.delayHours === "number" ? body.delayHours : Number(body.delayHours);
  const delayHours = Number.isFinite(delayRaw) ? Math.floor(delayRaw) : 24;

  if (delayHours < 0 || delayHours > 24 * 30) {
    return NextResponse.json(
      { error: "Delay must be a number between 0 and 720 hours." },
      { status: 400 },
    );
  }

  if (feedback.status !== FeedbackStatus.RESOLVED) {
    await prisma.feedback.update({
      where: { id: feedback.id },
      data: {
        status: FeedbackStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  const [positivePlaybook, template] = await Promise.all([
    prisma.loyaltyPlaybook.findFirst({
      where: {
        businessId,
        status: LoyaltyPlaybookStatus.ACTIVE,
        trigger: LoyaltyTrigger.FEEDBACK_POSITIVE,
      },
      select: {
        id: true,
        offerId: true,
        templateId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.loyaltyTemplate.findFirst({
      where: {
        businessId,
        category: LoyaltyTemplateCategory.GREAT,
        isDefault: true,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const status = feedback.customerEmail ? LoyaltyMessageStatus.PENDING : LoyaltyMessageStatus.SKIPPED;
  const message = await prisma.loyaltyMessage.create({
    data: {
      businessId,
      locationId: feedback.locationId,
      playbookId: positivePlaybook?.id ?? null,
      templateId: positivePlaybook?.templateId ?? template?.id ?? null,
      offerId: positivePlaybook?.offerId ?? null,
      feedbackId: feedback.id,
      customerName: feedback.customerName,
      customerEmail: feedback.customerEmail,
      status,
      sendAfter: new Date(Date.now() + delayHours * 60 * 60 * 1000),
      skipReason: feedback.customerEmail ? null : "missing_customer_email",
    },
    select: {
      id: true,
      status: true,
      sendAfter: true,
    },
  });

  await trackValidationEvent({
    event: validationEvent.loyaltyRecoveryResolved,
    businessId,
    locationId: feedback.locationId,
    metadata: {
      feedbackId: feedback.id,
      messageId: message.id,
      queuedStatus: message.status,
      delayHours,
    },
  });

  return NextResponse.json({
    ok: true,
    feedbackId: feedback.id,
    message,
  });
}
