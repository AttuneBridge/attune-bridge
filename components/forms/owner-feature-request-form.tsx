"use client";

import { FormEvent, useState } from "react";

type OwnerFeatureRequestFormProps = {
  businessId: string;
};

type FeatureRequestResponse = {
  ok?: boolean;
  error?: string;
};

const moduleOptions = [
  { value: "REVIEWS", label: "Reviews" },
  { value: "SCHEDULER", label: "Last-Minute Scheduler" },
  { value: "LOYALTY", label: "Loyalty Builder" },
  { value: "MISSED_CALL_TEXTBACK", label: "Missed Call Text Back" },
  { value: "PLATFORM", label: "Platform / Dashboard" },
] as const;

export function OwnerFeatureRequestForm({ businessId }: OwnerFeatureRequestFormProps) {
  const maxDetailsLength = 1000;
  const [module, setModule] = useState<(typeof moduleOptions)[number]["value"]>("REVIEWS");
  const [details, setDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedDetails = details.trim();

    if (!normalizedDetails) {
      setError("Please add your feature request.");
      setSuccessMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/feature-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module,
            details: normalizedDetails,
          }),
        },
      );

      const result = (await response.json()) as FeatureRequestResponse;

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Could not submit your request right now.");
        return;
      }

      setDetails("");
      setSuccessMessage("Thanks - we logged your request for the next validation round.");
    } catch {
      setError("Could not submit your request right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="featureRequestModule" className="mb-1.5 block text-sm font-medium text-slate-800">
          Which module is this for?
        </label>
        <select
          id="featureRequestModule"
          value={module}
          onChange={(event) => setModule(event.target.value as (typeof moduleOptions)[number]["value"])}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
        >
          {moduleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="featureRequestDetails" className="mb-1.5 block text-sm font-medium text-slate-800">
          What feature would help most?
        </label>
        <textarea
          id="featureRequestDetails"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className="min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          placeholder="Example: I need a daily digest showing unresolved negative feedback by location."
          maxLength={maxDetailsLength}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          {details.length}/{maxDetailsLength} characters
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Submitting..." : "Submit feature request"}
      </button>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
    </form>
  );
}
