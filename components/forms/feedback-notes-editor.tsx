"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FeedbackNotesEditorProps = {
  feedbackId: string;
  initialNotes: string | null;
};

export function FeedbackNotesEditor({ feedbackId, initialNotes }: FeedbackNotesEditorProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notes }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save notes.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not save notes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={4}
        placeholder="Add internal follow-up notes..."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save notes"}
        </button>
        <button
          type="button"
          onClick={() => setNotes("")}
          disabled={isSaving}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
