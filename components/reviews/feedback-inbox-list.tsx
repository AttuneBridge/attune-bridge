"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FeedbackStatusControls } from "@/components/forms/feedback-status-controls";

type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
type FeedbackStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";
type RecoveryOutcome = "SAVED" | "UNSAVED" | "ESCALATED" | null;
type FollowUpPreference = "TEXT" | "CALL" | "EMAIL" | null;
type NotificationChannel = "EMAIL" | "SMS";
type NotificationStatus = "SENT" | "FAILED" | "SKIPPED";
type SlaFilter = "ALL" | "AT_RISK" | "BREACHED" | "REMINDER_OVERDUE";

type FeedbackInboxEntry = {
  id: string;
  sentiment: Sentiment;
  status: FeedbackStatus;
  recoveryOutcome: RecoveryOutcome;
  createdAt: string;
  resolvedAt: string | null;
  nextFollowUpAt: string | null;
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

const outcomeStyles: Record<Exclude<RecoveryOutcome, null>, string> = {
  SAVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  UNSAVED: "bg-amber-100 text-amber-800 border-amber-200",
  ESCALATED: "bg-rose-100 text-rose-800 border-rose-200",
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

function formatOutcome(outcome: Exclude<RecoveryOutcome, null>) {
  return outcome.charAt(0) + outcome.slice(1).toLowerCase();
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

function getOpenCaseAgeHours(createdAt: string, nowMs: number) {
  const createdMs = new Date(createdAt).getTime();
  return Math.max(0, Math.floor((nowMs - createdMs) / (1000 * 60 * 60)));
}

function getSlaSignals(entry: FeedbackInboxEntry, nowMs: number) {
  const isOpenCase = entry.status !== "RESOLVED";
  const ageHours = getOpenCaseAgeHours(entry.createdAt, nowMs);
  const isOver24h = isOpenCase && ageHours >= 24;
  const isOver72h = isOpenCase && ageHours >= 72;
  const followUpAtMs = entry.nextFollowUpAt ? new Date(entry.nextFollowUpAt).getTime() : null;
  const reminderOverdue = isOpenCase && followUpAtMs !== null && followUpAtMs <= nowMs;
  const reminderDueSoon =
    isOpenCase &&
    followUpAtMs !== null &&
    followUpAtMs > nowMs &&
    followUpAtMs <= nowMs + 24 * 60 * 60 * 1000;

  return {
    ageHours,
    isOpenCase,
    isOver24h,
    isOver72h,
    reminderOverdue,
    reminderDueSoon,
  };
}

export function FeedbackInboxList({ entries, exportHref }: { entries: FeedbackInboxEntry[]; exportHref: string }) {
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "ALL">("ALL");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("ALL");
  const nowMs = Date.now();

  const entriesWithSla = useMemo(() => {
    return entries.map((entry) => ({
      ...entry,
      ...getSlaSignals(entry, nowMs),
    }));
  }, [entries, nowMs]);

  const slaSummary = useMemo(() => {
    const openCases = entriesWithSla.filter((entry) => entry.isOpenCase);
    const openOver24h = openCases.filter((entry) => entry.isOver24h).length;
    const openOver72h = openCases.filter((entry) => entry.isOver72h).length;
    const reminderOverdue = openCases.filter((entry) => entry.reminderOverdue).length;
    const reminderDueSoon = openCases.filter((entry) => entry.reminderDueSoon).length;

    return {
      openCases: openCases.length,
      openOver24h,
      openOver72h,
      reminderOverdue,
      reminderDueSoon,
    };
  }, [entriesWithSla]);

  const recoverySummary = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        if (!entry.recoveryOutcome) {
          return acc;
        }

        acc[entry.recoveryOutcome] += 1;
        return acc;
      },
      { SAVED: 0, UNSAVED: 0, ESCALATED: 0 },
    );
  }, [entries]);

  const recoveryTrends = useMemo(() => {
    const summarizeWindow = (days: number) => {
      const cutoffMs = nowMs - days * 24 * 60 * 60 * 1000;
      const resolvedInWindow = entries.filter((entry) => {
        if (!entry.resolvedAt) {
          return false;
        }

        return new Date(entry.resolvedAt).getTime() >= cutoffMs;
      });

      const saved = resolvedInWindow.filter((entry) => entry.recoveryOutcome === "SAVED").length;
      const unsaved = resolvedInWindow.filter((entry) => entry.recoveryOutcome === "UNSAVED").length;
      const escalated = resolvedInWindow.filter((entry) => entry.recoveryOutcome === "ESCALATED").length;
      const unresolvedOutcome = resolvedInWindow.filter((entry) => entry.recoveryOutcome === null).length;
      const resolvedCount = resolvedInWindow.length;
      const savedRate = resolvedCount === 0 ? 0 : Math.round((saved / resolvedCount) * 100);

      return {
        resolvedCount,
        saved,
        unsaved,
        escalated,
        unresolvedOutcome,
        savedRate,
      };
    };

    return {
      sevenDay: summarizeWindow(7),
      thirtyDay: summarizeWindow(30),
    };
  }, [entries, nowMs]);

  const filteredEntries = useMemo(() => {
    return entriesWithSla
      .filter((entry) => {
      const sentimentMatches = sentimentFilter === "ALL" || entry.sentiment === sentimentFilter;
      const statusMatches = statusFilter === "ALL" || entry.status === statusFilter;
      const slaMatches =
        slaFilter === "ALL" ||
        (slaFilter === "AT_RISK" && entry.isOver24h && !entry.isOver72h) ||
        (slaFilter === "BREACHED" && entry.isOver72h) ||
        (slaFilter === "REMINDER_OVERDUE" && entry.reminderOverdue);

      return sentimentMatches && statusMatches && slaMatches;
      })
      .sort((a, b) => {
        const getPriorityBucket = (entry: (typeof entriesWithSla)[number]) => {
          if (entry.isOver72h || entry.reminderOverdue) {
            return 0;
          }

          if (entry.isOver24h || entry.reminderDueSoon) {
            return 1;
          }

          if (entry.isOpenCase) {
            return 2;
          }

          return 3;
        };

        const bucketDelta = getPriorityBucket(a) - getPriorityBucket(b);
        if (bucketDelta !== 0) {
          return bucketDelta;
        }

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [entriesWithSla, sentimentFilter, slaFilter, statusFilter]);

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
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recovery Trend</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Last 7 days</p>
              <p className="mt-1">Resolved: {recoveryTrends.sevenDay.resolvedCount}</p>
              <p>Saved rate: {recoveryTrends.sevenDay.savedRate}%</p>
              <p>
                Saved {recoveryTrends.sevenDay.saved} / Unsaved {recoveryTrends.sevenDay.unsaved} / Escalated {recoveryTrends.sevenDay.escalated}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Last 30 days</p>
              <p className="mt-1">Resolved: {recoveryTrends.thirtyDay.resolvedCount}</p>
              <p>Saved rate: {recoveryTrends.thirtyDay.savedRate}%</p>
              <p>
                Saved {recoveryTrends.thirtyDay.saved} / Unsaved {recoveryTrends.thirtyDay.unsaved} / Escalated {recoveryTrends.thirtyDay.escalated}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SLA Watch</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              Open cases: {slaSummary.openCases}
            </span>
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
              &gt;24h open: {slaSummary.openOver24h}
            </span>
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-medium text-rose-800">
              &gt;72h open: {slaSummary.openOver72h}
            </span>
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-medium text-rose-800">
              Reminder overdue: {slaSummary.reminderOverdue}
            </span>
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-medium text-sky-800">
              Reminder due &lt;24h: {slaSummary.reminderDueSoon}
            </span>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recovery Outcomes</p>
            <a
              href={exportHref}
              className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-100"
            >
              Export weekly SLA CSV
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
              Saved: {recoverySummary.SAVED}
            </span>
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
              Unsaved: {recoverySummary.UNSAVED}
            </span>
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-medium text-rose-800">
              Escalated: {recoverySummary.ESCALATED}
            </span>
            <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              Resolved without outcome (7d): {recoveryTrends.sevenDay.unresolvedOutcome}
            </span>
          </div>
        </div>

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

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SLA queue</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "ALL", label: "All" },
              { value: "AT_RISK", label: "At Risk" },
              { value: "BREACHED", label: "Breached" },
              { value: "REMINDER_OVERDUE", label: "Reminder Overdue" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSlaFilter(option.value)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  slaFilter === option.value
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
                {entry.recoveryOutcome ? (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${outcomeStyles[entry.recoveryOutcome]}`}
                  >
                    {formatOutcome(entry.recoveryOutcome)}
                  </span>
                ) : null}
                <p className="text-sm font-medium text-slate-900">
                  {entry.location.business.name} - {entry.location.name}
                </p>
                <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                {entry.isOpenCase ? (
                  <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    Open {entry.ageHours}h
                  </span>
                ) : null}
                {entry.isOver24h ? (
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    SLA at risk
                  </span>
                ) : null}
                {entry.isOver72h ? (
                  <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                    SLA breached
                  </span>
                ) : null}
                {entry.reminderOverdue ? (
                  <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                    Reminder overdue
                  </span>
                ) : null}
                {entry.reminderDueSoon ? (
                  <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                    Reminder due soon
                  </span>
                ) : null}
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
                <FeedbackStatusControls
                  feedbackId={entry.id}
                  currentStatus={entry.status}
                  currentOutcome={entry.recoveryOutcome}
                  nextFollowUpAtIso={entry.nextFollowUpAt}
                />
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
