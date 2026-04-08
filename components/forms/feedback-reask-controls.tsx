"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FeedbackReaskControlsProps = {
  feedbackId: string;
  disabled?: boolean;
  sentAtIso?: string | null;
};

export function FeedbackReaskControls({
  feedbackId,
  disabled = false,
  sentAtIso = null,
}: FeedbackReaskControlsProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (channel: "SMS" | "EMAIL") => {
    if (isSaving || disabled) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/reask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not mark review re-ask.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not mark review re-ask.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => send("SMS")}
          disabled={isSaving || disabled}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark re-ask sent via SMS
        </button>
        <button
          type="button"
          onClick={() => send("EMAIL")}
          disabled={isSaving || disabled}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark re-ask sent via email
        </button>
      </div>
      {sentAtIso ? <p className="text-xs text-emerald-700">Re-ask already recorded at {new Date(sentAtIso).toLocaleString()}.</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
