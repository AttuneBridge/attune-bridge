"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AssignmentOption = {
  id: string;
  email: string;
};

type FeedbackAssignmentControlsProps = {
  feedbackId: string;
  currentAssignedMembershipId: string | null;
  options: AssignmentOption[];
};

export function FeedbackAssignmentControls({
  feedbackId,
  currentAssignedMembershipId,
  options,
}: FeedbackAssignmentControlsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentAssignedMembershipId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedMembershipId: selected || null }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not update assignment.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not update assignment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          disabled={isSaving}
        >
          <option value="">Unassigned</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.email}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Update assignee"}
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
