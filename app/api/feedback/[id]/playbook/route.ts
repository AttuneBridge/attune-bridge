import { BusinessMembershipRole, FeedbackStatus, Sentiment } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type PlaybookTemplate = "NEGATIVE_URGENT_CALLBACK" | "NEGATIVE_MANAGER_ESCALATION" | "NEUTRAL_SERVICE_RECOVERY";

type PlaybookRequestBody = {
  template?: unknown;
};

const TEMPLATE_NOTE_LINES: Record<PlaybookTemplate, string> = {
  NEGATIVE_URGENT_CALLBACK:
    "Playbook: Negative urgent callback. Owner follow-up by phone/text within 2h. Confirm resolution progress at 24h.",
  NEGATIVE_MANAGER_ESCALATION:
    "Playbook: Manager escalation. Assign escalation owner, review context same day, and confirm update with customer within 24h.",
  NEUTRAL_SERVICE_RECOVERY:
    "Playbook: Neutral recovery follow-up. Send appreciation + clarification message and check in at 48h.",
};

const TEMPLATE_REMINDER_HOURS: Record<PlaybookTemplate, number> = {
  NEGATIVE_URGENT_CALLBACK: 24,
  NEGATIVE_MANAGER_ESCALATION: 24,
  NEUTRAL_SERVICE_RECOVERY: 48,
};

function parseTemplate(value: unknown): PlaybookTemplate | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim() as PlaybookTemplate;
  if (!(normalized in TEMPLATE_NOTE_LINES)) {
    return null;
  }

  return normalized;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getRequestIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: PlaybookRequestBody;

  try {
    body = (await request.json()) as PlaybookRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const template = parseTemplate(body.template);
  if (!template) {
    return NextResponse.json({ error: "Valid playbook template is required." }, { status: 400 });
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      locationId: true,
      sentiment: true,
      status: true,
      internalNotes: true,
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

  const actorMembership = await prisma.businessMembership.findFirst({
    where: {
      businessId: feedback.location.businessId,
      userId: identity.userId,
      role: BusinessMembershipRole.OWNER,
    },
    select: { id: true },
  });

  if (!actorMembership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (template.startsWith("NEGATIVE") && feedback.sentiment !== Sentiment.NEGATIVE) {
    return NextResponse.json({ error: "Selected playbook requires negative feedback sentiment." }, { status: 400 });
  }

  if (template.startsWith("NEUTRAL") && feedback.sentiment !== Sentiment.NEUTRAL) {
    return NextResponse.json({ error: "Selected playbook requires neutral feedback sentiment." }, { status: 400 });
  }

  const now = new Date();
  const noteLine = TEMPLATE_NOTE_LINES[template];
  const reminderHours = TEMPLATE_REMINDER_HOURS[template];
  const nextFollowUpAt = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
  const notePrefix = `[${now.toISOString()}] ${noteLine}`;
  const updatedNotes = feedback.internalNotes?.trim()
    ? `${feedback.internalNotes.trim()}\n${notePrefix}`
    : notePrefix;

  const updated = await prisma.feedback.update({
    where: { id: feedback.id },
    data: {
      status: feedback.status === FeedbackStatus.NEW ? FeedbackStatus.IN_PROGRESS : feedback.status,
      nextFollowUpAt,
      internalNotes: updatedNotes,
    },
    select: {
      id: true,
      status: true,
      nextFollowUpAt: true,
      internalNotes: true,
    },
  });

  await trackValidationEvent({
    event: validationEvent.reviewsRecoveryPlaybookApplied,
    businessId: feedback.location.businessId,
    locationId: feedback.locationId,
    metadata: {
      feedbackId: feedback.id,
      template,
      reminderHours,
    },
  });

  return NextResponse.json({ ok: true, feedback: updated });
}
