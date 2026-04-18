"use client";

import { FormEvent, useState } from "react";
import { DEFAULT_REVIEW_REQUEST_TEMPLATE } from "@/lib/reviews/review-request-template";

type ReviewRequestTemplateFormProps = {
  businessId: string;
  initialTemplate: string | null;
  businessName: string;
};

const TEMPLATE_MAX_LENGTH = 320;

export function ReviewRequestTemplateForm({
  businessId,
  initialTemplate,
  businessName,
}: ReviewRequestTemplateFormProps) {
  const [template, setTemplate] = useState(initialTemplate ?? DEFAULT_REVIEW_REQUEST_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    setError(null);

    const trimmedTemplate = template.trim();

    if (trimmedTemplate.length > TEMPLATE_MAX_LENGTH) {
      setError(`Template must be ${TEMPLATE_MAX_LENGTH} characters or fewer.`);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/businesses/${businessId}/review-request-template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: trimmedTemplate,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not save the review request template.");
        return;
      }

      setSaved(true);
    } catch {
      setError("Could not save the review request template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-slate-700">
        This message is copied from your QR page for follow-up texts after service calls.
      </p>
      <p className="text-xs text-slate-500">
        Use <code>{"{businessName}"}</code> and <code>{"{formUrl}"}</code> placeholders.
      </p>

      <label htmlFor="reviewRequestTemplate" className="sr-only">
        Review request template
      </label>
      <textarea
        id="reviewRequestTemplate"
        rows={4}
        value={template}
        onChange={(event) => setTemplate(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900"
        maxLength={TEMPLATE_MAX_LENGTH}
      />

      <p className="text-xs text-slate-500">
        Preview with your business name: {template.replaceAll("{businessName}", businessName)}
      </p>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Template saved.</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Saving..." : "Save review text"}
      </button>
    </form>
  );
}
