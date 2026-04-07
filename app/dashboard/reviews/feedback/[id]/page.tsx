import Link from "next/link";
import {
  FeedbackStatus,
  FollowUpPreference,
  NotificationChannel,
  NotificationStatus,
  Sentiment,
} from "@prisma/client";
import { FeedbackStatusControls } from "@/components/forms/feedback-status-controls";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

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

function formatSentiment(sentiment: Sentiment) {
  return sentiment.charAt(0) + sentiment.slice(1).toLowerCase();
}

function formatStatus(status: FeedbackStatus) {
  return status.replace("_", " ").toLowerCase().replace(/(^\w|\s\w)/g, (match: string) => match.toUpperCase());
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
    },
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
            <FeedbackStatusControls feedbackId={feedback.id} currentStatus={feedback.status} />
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
