import Link from "next/link";
import {
  BusinessMembershipRole,
  FeedbackStatus,
  FollowUpPreference,
  NotificationChannel,
  NotificationStatus,
  RecoveryOutcome,
  Sentiment,
} from "@prisma/client";
import { FeedbackAssignmentControls } from "@/components/forms/feedback-assignment-controls";
import { FeedbackNotesEditor } from "@/components/forms/feedback-notes-editor";
import { FeedbackPlaybookTemplates } from "@/components/forms/feedback-playbook-templates";
import { FeedbackStatusControls } from "@/components/forms/feedback-status-controls";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";
import { validationEvent } from "@/lib/validation-events";

type FeedbackDetailPageProps = {
  params: Promise<{ id: string }>;
};

const sentimentStyles: Record<Sentiment, string> = {
  POSITIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  NEUTRAL: "bg-amber-100 text-amber-800 border-amber-200",
  NEGATIVE: "bg-rose-100 text-rose-800 border-rose-200",
};

const statusStyles: Record<FeedbackStatus, string> = {
  NEW: "bg-sky-100 text-sky-800 border-sky-200",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800 border-indigo-200",
  RESOLVED: "bg-slate-200 text-slate-700 border-slate-300",
};

const outcomeStyles: Record<RecoveryOutcome, string> = {
  SAVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  UNSAVED: "bg-amber-100 text-amber-800 border-amber-200",
  ESCALATED: "bg-rose-100 text-rose-800 border-rose-200",
};

function formatSentiment(sentiment: Sentiment) {
  return sentiment.charAt(0) + sentiment.slice(1).toLowerCase();
}

function formatStatus(status: FeedbackStatus) {
  return status.replace("_", " ").toLowerCase().replace(/(^\w|\s\w)/g, (match: string) => match.toUpperCase());
}

function formatOutcome(outcome: RecoveryOutcome) {
  return outcome.charAt(0) + outcome.slice(1).toLowerCase();
}

function formatFollowUpPreference(preference: FollowUpPreference | null) {
  if (!preference) {
    return "(none)";
  }

  return preference.charAt(0) + preference.slice(1).toLowerCase();
}

function formatNotificationStatus(status: NotificationStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatChannel(channel: NotificationChannel) {
  return channel === NotificationChannel.EMAIL ? "Email" : "SMS";
}

function toPhoneHref(phone: string) {
  return phone.replace(/[^+\d]/g, "");
}

function buildEmailBody(customerName: string | null, businessName: string, locationName: string) {
  const greeting = customerName?.trim() ? customerName.trim() : "there";

  return [
    `Hi ${greeting},`,
    "",
    `Thank you for sharing your feedback with ${businessName} (${locationName}).`,
    "I am sorry your recent experience did not meet expectations.",
    "",
    "I would appreciate the chance to make this right. If you are open to it, could you share a little more detail about what happened?",
    "",
    "Thank you,",
    businessName,
  ].join("\n");
}

function buildSmsBody(customerName: string | null, businessName: string) {
  const greeting = customerName?.trim() ? customerName.trim() : "there";

  return `Hi ${greeting} - this is ${businessName}. Thank you for your feedback. I am sorry your experience missed the mark. I would like to make it right; could you share a little more detail?`;
}

function formatTimelineEvent(eventName: string, metadata: Record<string, unknown> | null) {
  switch (eventName) {
    case "feedback_submitted":
      return "Case created from private feedback";
    case "reviews_case_status_updated":
      return `Status updated to ${String(metadata?.nextStatus ?? "(unknown)")}`;
    case "reviews_recovery_outcome_updated":
      return `Recovery outcome set to ${String(metadata?.nextOutcome ?? "(unknown)")}`;
    case "reviews_follow_up_reminder_set":
      return `Follow-up reminder set (${String(metadata?.reminderHours ?? "?")}h)`;
    case "reviews_follow_up_reminder_cleared":
      return "Follow-up reminder cleared";
    case "reviews_case_assigned":
      return metadata?.nextAssignedMembershipId ? "Case assigned" : "Case unassigned";
    case "reviews_recovery_playbook_applied":
      return `Recovery playbook applied: ${String(metadata?.template ?? "(unknown)")}`;
    case "reviews_internal_notes_updated":
      return metadata?.hasNotes ? "Internal notes updated" : "Internal notes cleared";
    default:
      return eventName;
  }
}

export default async function DashboardFeedbackDetailPage({ params }: FeedbackDetailPageProps) {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const { id } = await params;

  const feedback = await prisma.feedback.findFirst({
    where: {
      id,
      location: {
        businessId: workspace.businessId,
      },
    },
    include: {
      location: {
        include: {
          business: true,
        },
      },
      notificationEvents: {
        orderBy: {
          createdAt: "desc",
        },
      },
      assignedMembership: {
        select: {
          id: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  const assignmentOptions = await prisma.businessMembership.findMany({
    where: {
      businessId: workspace.businessId,
      role: BusinessMembershipRole.OWNER,
    },
    select: {
      id: true,
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const timelineEvents = await prisma.validationEvent.findMany({
    where: {
      businessId: workspace.businessId,
      event: {
        in: [
          validationEvent.feedbackSubmitted,
          validationEvent.reviewsCaseStatusUpdated,
          validationEvent.reviewsRecoveryOutcomeUpdated,
          validationEvent.reviewsFollowUpReminderSet,
          validationEvent.reviewsFollowUpReminderCleared,
          validationEvent.reviewsCaseAssigned,
          validationEvent.reviewsRecoveryPlaybookApplied,
          validationEvent.reviewsInternalNotesUpdated,
        ],
      },
      metadata: {
        path: ["feedbackId"],
        equals: id,
      },
    },
    select: {
      id: true,
      event: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  if (!feedback) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Feedback not found</h1>
          <p className="text-sm text-slate-600">This feedback entry may have been deleted.</p>
          <Link href="/dashboard/reviews/feedback" className="text-sm font-medium text-slate-900 underline">
            Back to feedback inbox
          </Link>
        </Card>
      </main>
    );
  }

  const hasEmail = Boolean(feedback.customerEmail);
  const phoneHref = feedback.phone ? toPhoneHref(feedback.phone) : null;
  const hasPhone = Boolean(phoneHref);
  const emailSubject = `Following up on your recent ${feedback.location.business.name} visit`;
  const emailBody = buildEmailBody(
    feedback.customerName,
    feedback.location.business.name,
    feedback.location.name,
  );
  const smsBody = buildSmsBody(feedback.customerName, feedback.location.business.name);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
      <div className="space-y-5">
        <Link
          href="/dashboard/reviews/feedback"
          className="text-sm font-medium text-slate-700 underline underline-offset-2"
        >
          Back to feedback inbox
        </Link>

        <Card className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${sentimentStyles[feedback.sentiment]}`}
              >
                {formatSentiment(feedback.sentiment)}
              </span>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[feedback.status]}`}
              >
                {formatStatus(feedback.status)}
              </span>
              {feedback.recoveryOutcome ? (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${outcomeStyles[feedback.recoveryOutcome]}`}
                >
                  {formatOutcome(feedback.recoveryOutcome)}
                </span>
              ) : null}
              <p className="text-xs text-slate-500">Received {new Date(feedback.createdAt).toLocaleString()}</p>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {feedback.location.business.name} - {feedback.location.name}
            </h1>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Customer Message</p>
              <p className="text-sm text-slate-700">{feedback.message?.trim() || "(No message provided)"}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Case Status</p>
            <FeedbackStatusControls
              feedbackId={feedback.id}
              currentStatus={feedback.status}
              currentOutcome={feedback.recoveryOutcome}
              nextFollowUpAtIso={feedback.nextFollowUpAt ? feedback.nextFollowUpAt.toISOString() : null}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recovery Playbook Templates</p>
              <p className="text-sm text-slate-700">
                Apply a guided follow-up template to set reminder timing and append standardized recovery notes.
              </p>
              <FeedbackPlaybookTemplates feedbackId={feedback.id} sentiment={feedback.sentiment} />
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Case Assignment</p>
              <p className="text-sm text-slate-700">
                Current assignee: {feedback.assignedMembership?.user.email ?? "Unassigned"}
              </p>
              <FeedbackAssignmentControls
                feedbackId={feedback.id}
                currentAssignedMembershipId={feedback.assignedMembershipId}
                options={assignmentOptions.map((option) => ({ id: option.id, email: option.user.email }))}
              />
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Internal Notes</p>
              <FeedbackNotesEditor feedbackId={feedback.id} initialNotes={feedback.internalNotes} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Customer Details</p>
              <p>Customer name: {feedback.customerName || "(not provided)"}</p>
              <p>Customer email: {feedback.customerEmail || "(not provided)"}</p>
              <p>Phone: {feedback.phone || "(not provided)"}</p>
              <p>Preferred contact method: {formatFollowUpPreference(feedback.followUpPreference)}</p>
              <p>Follow-up requested: {feedback.wantsFollowUp ? "Yes" : "No"}</p>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Quick Actions</p>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                {hasEmail ? (
                  <a
                    href={`mailto:${feedback.customerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  >
                    Email customer
                  </a>
                ) : null}

                {hasPhone ? (
                  <a
                    href={`tel:${phoneHref}`}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  >
                    Call customer
                  </a>
                ) : null}

                {hasPhone ? (
                  <a
                    href={`sms:${phoneHref}?body=${encodeURIComponent(smsBody)}`}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  >
                    Text customer
                  </a>
                ) : null}

                {!hasEmail && !hasPhone ? (
                  <p className="text-xs text-slate-600">No contact details provided for direct follow-up.</p>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Case Activity Timeline</h2>
            <p className="text-sm text-slate-600">Status, assignment, reminder, and notes changes for this case.</p>
          </div>

          {timelineEvents.length === 0 ? (
            <p className="text-sm text-slate-600">No case activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {timelineEvents.map((event) => {
                const metadata =
                  event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
                    ? (event.metadata as Record<string, unknown>)
                    : null;

                return (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{formatTimelineEvent(event.event, metadata)}</p>
                    <p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Notification Event History</h2>
            <p className="text-sm text-slate-600">Delivery and fallback details for each alert attempt.</p>
          </div>

          {feedback.notificationEvents.length === 0 ? (
            <p className="text-sm text-slate-600">No notification events recorded for this feedback yet.</p>
          ) : (
            <div className="space-y-2">
              {feedback.notificationEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                      {formatChannel(event.channel)}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                      {formatNotificationStatus(event.status)}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 space-y-1 text-xs text-slate-600">
                    <p>Reason: {event.reason || "(none)"}</p>
                    <p>Provider message ID: {event.providerMessageId || "(none)"}</p>
                    <p>Error: {event.errorMessage || "(none)"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
