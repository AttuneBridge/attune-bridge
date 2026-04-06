"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FeedbackStatusControls } from "@/components/forms/feedback-status-controls";

type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
type FeedbackStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";
type FollowUpPreference = "TEXT" | "CALL" | "EMAIL" | null;
type NotificationChannel = "EMAIL" | "SMS";
type NotificationStatus = "SENT" | "FAILED" | "SKIPPED";

type FeedbackInboxEntry = {
  id: string;
  sentiment: Sentiment;
  status: FeedbackStatus;
  createdAt: string;
  message: string | null;
  wantsFollowUp: boolean;
  followUpPreference: FollowUpPreference;
  customerName: string | null;
  customerEmail: string | null;
  phone: string | null;
  location: {
    name: string;
    business: {
      name: string;
    };
  };
  notificationEvents: Array<{
    channel: NotificationChannel;
    status: NotificationStatus;
    reason: string | null;
    createdAt: string;
  }>;
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

function formatFeedbackStatus(status: FeedbackStatus) {
  return status
    .replace("_", " ")
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (match: string) => match.toUpperCase());
}

function formatFollowUpPreference(preference: FollowUpPreference) {
  if (!preference) {
    return null;
  }

  return preference.charAt(0) + preference.slice(1).toLowerCase();
}

function formatNotificationStatus(status: NotificationStatus | null) {
  if (!status) {
    return "Not attempted";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
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

function formatMessagePreview(message: string | null) {
  const normalized = message?.trim() || "No message provided.";

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
}

export function FeedbackInboxList({ entries }: { entries: FeedbackInboxEntry[] }) {
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "ALL">("ALL");

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const sentimentMatches = sentimentFilter === "ALL" || entry.sentiment === sentimentFilter;
      const statusMatches = statusFilter === "ALL" || entry.status === statusFilter;
      return sentimentMatches && statusMatches;
    });
  }, [entries, sentimentFilter, statusFilter]);

  const allExpanded = filteredEntries.length > 0 && filteredEntries.every((entry) => expandedEntryIds.has(entry.id));

  const handleToggleAll = () => {
    setExpandedEntryIds((previous) => {
      const next = new Set(previous);

      if (allExpanded) {
        for (const entry of filteredEntries) {
          next.delete(entry.id);
        }
        return next;
      }

      for (const entry of filteredEntries) {
        next.add(entry.id);
      }
      return next;
    });
  };

  const handleToggleOne = (entryId: string, isOpen: boolean) => {
    setExpandedEntryIds((previous) => {
      const next = new Set(previous);

      if (isOpen) {
        next.add(entryId);
      } else {
        next.delete(entryId);
      }

      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sentiment</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "ALL", label: "All" },
              { value: "NEGATIVE", label: "Negative" },
              { value: "NEUTRAL", label: "Neutral" },
              { value: "POSITIVE", label: "Positive" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSentimentFilter(option.value)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  sentimentFilter === option.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Case status</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "ALL", label: "All" },
              { value: "NEW", label: "New" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "RESOLVED", label: "Resolved" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === option.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Showing {filteredEntries.length} of {entries.length} cases
          </p>
          <button
            type="button"
            onClick={handleToggleAll}
            disabled={filteredEntries.length === 0}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <p className="text-sm text-slate-700">No feedback matches the selected filters.</p>
        </div>
      ) : (
        filteredEntries.map((entry) => {
        const hasEmail = Boolean(entry.customerEmail);
        const phoneHref = entry.phone ? toPhoneHref(entry.phone) : null;
        const hasPhone = Boolean(phoneHref);
        const emailSubject = `Following up on your recent ${entry.location.business.name} visit`;
        const emailBody = buildEmailBody(entry.customerName, entry.location.business.name, entry.location.name);
        const smsBody = buildSmsBody(entry.customerName, entry.location.business.name);

        const preferredAction =
          entry.followUpPreference === "EMAIL" && hasEmail
            ? {
                label: "Reply via preferred method (Email)",
                href: `mailto:${entry.customerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
              }
            : entry.followUpPreference === "CALL" && hasPhone
              ? {
                  label: "Reply via preferred method (Call)",
                  href: `tel:${phoneHref}`,
                }
              : entry.followUpPreference === "TEXT" && hasPhone
                ? {
                    label: "Reply via preferred method (Text)",
                    href: `sms:${phoneHref}?body=${encodeURIComponent(smsBody)}`,
                  }
                : null;

        const preferredMethodMissing =
          (entry.followUpPreference === "EMAIL" && !hasEmail) ||
          ((entry.followUpPreference === "CALL" || entry.followUpPreference === "TEXT") && !hasPhone);

        const fallbackActions = [
          hasEmail
            ? {
                label: "Email customer",
                href: `mailto:${entry.customerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
              }
            : null,
          hasPhone
            ? {
                label: "Call customer",
                href: `tel:${phoneHref}`,
              }
            : null,
          hasPhone
            ? {
                label: "Text customer",
                href: `sms:${phoneHref}?body=${encodeURIComponent(smsBody)}`,
              }
            : null,
        ].filter((action): action is { label: string; href: string } => Boolean(action));

        const actions = preferredAction ? [preferredAction] : fallbackActions;
        const latestEmailEvent = entry.notificationEvents.find((event) => event.channel === "EMAIL");
        const latestSmsEvent = entry.notificationEvents.find((event) => event.channel === "SMS");
        const isOpen = expandedEntryIds.has(entry.id);

          return (
          <details
            key={entry.id}
            open={isOpen}
            onToggle={(event) => handleToggleOne(entry.id, event.currentTarget.open)}
            className="rounded-xl border border-slate-200 bg-white"
          >
            <summary className="list-none cursor-pointer p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${sentimentStyles[entry.sentiment]}`}
                >
                  {formatSentiment(entry.sentiment)}
                </span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[entry.status]}`}
                >
                  {formatFeedbackStatus(entry.status)}
                </span>
                <p className="text-sm font-medium text-slate-900">
                  {entry.location.business.name} - {entry.location.name}
                </p>
                <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-2 text-sm text-slate-700">{formatMessagePreview(entry.message)}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">{isOpen ? "Collapse case details" : "Open case details"}</p>
            </summary>

            <div className="border-t border-slate-200 p-5 pt-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Customer Message
                </p>
                <p className="text-sm text-slate-800">{entry.message?.trim() || "(No message provided)"}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {entry.wantsFollowUp ? (
                  <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-medium text-indigo-800">
                    Follow-up requested
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                    No follow-up requested
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Case Status</p>
                <FeedbackStatusControls feedbackId={entry.id} currentStatus={entry.status} />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Customer Details
                  </p>
                  <p>Customer name: {entry.customerName || "(not provided)"}</p>
                  <p>Customer email: {entry.customerEmail || "(not provided)"}</p>
                  <p>Preferred contact method: {formatFollowUpPreference(entry.followUpPreference) || "(none)"}</p>
                  <p>Phone: {entry.phone || "(not provided)"}</p>
                </div>

                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Alert Delivery
                  </p>
                  <p>
                    Email alert: {formatNotificationStatus(latestEmailEvent?.status ?? null)}
                    {latestEmailEvent?.reason ? ` (${latestEmailEvent.reason})` : ""}
                  </p>
                  <p>
                    SMS alert: {formatNotificationStatus(latestSmsEvent?.status ?? null)}
                    {latestSmsEvent?.reason ? ` (${latestSmsEvent.reason})` : ""}
                  </p>
                </div>
              </div>

              {actions.length > 0 ? (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Quick Actions</p>
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    {actions.map((action) => (
                      <a
                        key={action.href}
                        href={action.href}
                        className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>

                  {preferredAction ? (
                    <p className="text-xs text-slate-500">Showing the customer&apos;s preferred contact channel.</p>
                  ) : null}

                  {preferredMethodMissing ? (
                    <p className="text-xs text-amber-700">
                      Preferred contact method is unavailable for this entry, so fallback options are shown.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3">
                <Link
                  href={`/dashboard/reviews/feedback/${entry.id}`}
                  className="text-xs font-medium text-slate-900 underline underline-offset-2"
                >
                  View full feedback details
                </Link>
              </div>
            </div>
          </details>
          );
        })
      )}
    </div>
  );
}
