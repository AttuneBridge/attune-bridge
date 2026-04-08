"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

type FeedbackPlaybookTemplatesProps = {
  feedbackId: string;
  sentiment: Sentiment;
};

type PlaybookTemplate = "NEGATIVE_URGENT_CALLBACK" | "NEGATIVE_MANAGER_ESCALATION" | "NEUTRAL_SERVICE_RECOVERY";

const templateConfig: Record<
  PlaybookTemplate,
  {
    label: string;
    sentiment: Sentiment;
    description: string;
  }
> = {
  NEGATIVE_URGENT_CALLBACK: {
    label: "Urgent Callback (24h reminder)",
    sentiment: "NEGATIVE",
    description: "Moves case to In Progress, adds callback plan notes, and sets a 24h follow-up reminder.",
  },
  NEGATIVE_MANAGER_ESCALATION: {
    label: "Manager Escalation (24h reminder)",
    sentiment: "NEGATIVE",
    description: "Adds escalation notes for manager review and sets a 24h follow-up reminder.",
  },
  NEUTRAL_SERVICE_RECOVERY: {
    label: "Neutral Recovery (48h reminder)",
    sentiment: "NEUTRAL",
    description: "Adds service recovery notes and schedules a 48h follow-up reminder.",
  },
};

export function FeedbackPlaybookTemplates({ feedbackId, sentiment }: FeedbackPlaybookTemplatesProps) {
  const router = useRouter();
  const [isApplying, setIsApplying] = useState<PlaybookTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templates = (Object.keys(templateConfig) as PlaybookTemplate[]).filter(
    (template) => templateConfig[template].sentiment === sentiment,
  );

  if (templates.length === 0) {
    return null;
  }

  const applyTemplate = async (template: PlaybookTemplate) => {
    if (isApplying) {
      return;
    }

    setError(null);
    setIsApplying(template);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/playbook`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not apply playbook template.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not apply playbook template.");
    } finally {
      setIsApplying(null);
    }
  };

  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <button
          key={template}
          type="button"
          onClick={() => applyTemplate(template)}
          disabled={Boolean(isApplying)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <p className="font-medium text-slate-900">
            {templateConfig[template].label}
            {isApplying === template ? " (Applying...)" : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{templateConfig[template].description}</p>
        </button>
      ))}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
