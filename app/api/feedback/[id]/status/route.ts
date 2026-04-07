import { FeedbackStatus, RecoveryOutcome } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StatusRequestBody = {
  status?: unknown;
  internalNotes?: unknown;
  recoveryOutcome?: unknown;
  followUpReminderHours?: unknown;
  clearFollowUpReminder?: unknown;
};

const feedbackStatusMap: Record<string, FeedbackStatus> = {
  NEW: FeedbackStatus.NEW,
  IN_PROGRESS: FeedbackStatus.IN_PROGRESS,
  RESOLVED: FeedbackStatus.RESOLVED,
};

const recoveryOutcomeMap: Record<string, RecoveryOutcome> = {
  SAVED: RecoveryOutcome.SAVED,
  UNSAVED: RecoveryOutcome.UNSAVED,
  ESCALATED: RecoveryOutcome.ESCALATED,
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let body: StatusRequestBody;

  try {
    body = (await request.json()) as StatusRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const statusRaw = typeof body.status === "string" ? body.status.trim() : "";
  const internalNotesRaw = typeof body.internalNotes === "string" ? body.internalNotes.trim() : null;
  const recoveryOutcomeRaw = typeof body.recoveryOutcome === "string" ? body.recoveryOutcome.trim() : "";
  const reminderHoursRaw =
    typeof body.followUpReminderHours === "number"
      ? body.followUpReminderHours
      : Number(body.followUpReminderHours);
  const clearFollowUpReminder = body.clearFollowUpReminder === true;

  if (!statusRaw && internalNotesRaw === null && !recoveryOutcomeRaw && !Number.isFinite(reminderHoursRaw) && !clearFollowUpReminder) {
    return NextResponse.json(
      { error: "Provide status, notes, outcome, or follow-up reminder changes." },
      { status: 400 },
    );
  }

  if (statusRaw && !(statusRaw in feedbackStatusMap)) {
    return NextResponse.json({ error: "Valid status is required." }, { status: 400 });
  }

  if (recoveryOutcomeRaw && !(recoveryOutcomeRaw in recoveryOutcomeMap)) {
    return NextResponse.json({ error: "Valid recovery outcome is required." }, { status: 400 });
  }

  if (clearFollowUpReminder && Number.isFinite(reminderHoursRaw)) {
    return NextResponse.json({ error: "Choose either clear reminder or reminder hours." }, { status: 400 });
  }

  if (Number.isFinite(reminderHoursRaw) && (reminderHoursRaw < 1 || reminderHoursRaw > 24 * 14)) {
    return NextResponse.json({ error: "Reminder hours must be between 1 and 336." }, { status: 400 });
  }

  const nextStatus = statusRaw ? feedbackStatusMap[statusRaw] : null;

  const current = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      recoveryOutcome: true,
      firstRespondedAt: true,
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  const now = new Date();
  const resultingStatus = nextStatus ?? current.status;
  const shouldSetFirstRespondedAt =
    current.status === FeedbackStatus.NEW &&
    resultingStatus !== FeedbackStatus.NEW &&
    current.firstRespondedAt === null;
  const shouldSetResolvedAt = nextStatus === FeedbackStatus.RESOLVED;
  const shouldResetResolvedAt = nextStatus === FeedbackStatus.NEW || nextStatus === FeedbackStatus.IN_PROGRESS;
  const nextRecoveryOutcome =
    resultingStatus === FeedbackStatus.RESOLVED
      ? recoveryOutcomeRaw
        ? recoveryOutcomeMap[recoveryOutcomeRaw]
        : current.recoveryOutcome
      : null;
  const nextFollowUpAt = clearFollowUpReminder
    ? null
    : Number.isFinite(reminderHoursRaw)
      ? new Date(now.getTime() + Math.floor(reminderHoursRaw) * 60 * 60 * 1000)
      : undefined;

  const updated = await prisma.feedback.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(internalNotesRaw === null ? {} : { internalNotes: internalNotesRaw }),
      ...(shouldSetFirstRespondedAt ? { firstRespondedAt: now } : {}),
      ...(shouldSetResolvedAt ? { resolvedAt: now } : {}),
      ...(shouldResetResolvedAt ? { resolvedAt: null } : {}),
      recoveryOutcome: nextRecoveryOutcome,
      ...(nextFollowUpAt === undefined ? {} : { nextFollowUpAt }),
    },
    select: {
      id: true,
      status: true,
      recoveryOutcome: true,
      firstRespondedAt: true,
      resolvedAt: true,
      nextFollowUpAt: true,
      internalNotes: true,
    },
  });

  return NextResponse.json({
    ok: true,
    feedback: updated,
  });
}
