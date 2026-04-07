"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FeedbackStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";
type RecoveryOutcome = "SAVED" | "UNSAVED" | "ESCALATED";

type FeedbackStatusControlsProps = {
  feedbackId: string;
  currentStatus: FeedbackStatus;
  currentOutcome?: RecoveryOutcome | null;
  nextFollowUpAtIso?: string | null;
};

const statusOptions: Array<{ value: FeedbackStatus; label: string }> = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

const outcomeOptions: Array<{ value: RecoveryOutcome; label: string }> = [
  { value: "SAVED", label: "Saved" },
  { value: "UNSAVED", label: "Unsaved" },
  { value: "ESCALATED", label: "Escalated" },
];

export function FeedbackStatusControls({
  feedbackId,
  currentStatus,
  currentOutcome = null,
  nextFollowUpAtIso = null,
}: FeedbackStatusControlsProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>(currentStatus);
  const [selectedOutcome, setSelectedOutcome] = useState<RecoveryOutcome | null>(currentOutcome);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateStatus = async (nextStatus: FeedbackStatus) => {
    if (nextStatus === selectedStatus || isSaving) {
      return;
    }

    setError(null);
    setSelectedStatus(nextStatus);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not update status.");
        setSelectedStatus(currentStatus);
        setSelectedOutcome(currentOutcome);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not update status.");
      setSelectedStatus(currentStatus);
      setSelectedOutcome(currentOutcome);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOutcome = async (nextOutcome: RecoveryOutcome) => {
    if (isSaving || selectedStatus !== "RESOLVED") {
      return;
    }

    setError(null);
    setSelectedOutcome(nextOutcome);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryOutcome: nextOutcome }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not update outcome.");
        setSelectedOutcome(currentOutcome);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not update outcome.");
      setSelectedOutcome(currentOutcome);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetReminder = async (hours: number) => {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpReminderHours: hours }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not set reminder.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not set reminder.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearReminder = async () => {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearFollowUpReminder: true }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not clear reminder.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not clear reminder.");
    } finally {
      setIsSaving(false);
    }
  };

  const reminderLabel = nextFollowUpAtIso
    ? `Follow-up due ${new Date(nextFollowUpAtIso).toLocaleString()}`
    : "No follow-up reminder set";

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleUpdateStatus(option.value)}
            disabled={isSaving}
            className={`rounded-full border px-2.5 py-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selectedStatus === option.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Resolution Outcome</p>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {outcomeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleUpdateOutcome(option.value)}
              disabled={isSaving || selectedStatus !== "RESOLVED"}
              className={`rounded-full border px-2.5 py-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedOutcome === option.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Follow-up Reminder</p>
        <p className="text-xs text-slate-600">{reminderLabel}</p>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {[24, 48, 72].map((hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => handleSetReminder(hours)}
              disabled={isSaving}
              className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remind in {hours}h
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearReminder}
            disabled={isSaving || !nextFollowUpAtIso}
            className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear reminder
          </button>
        </div>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
