"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FeedbackFormProps = {
  slug: string;
  sentiment: "neutral" | "negative";
  locationName: string;
};

export function FeedbackForm({ slug, sentiment, locationName }: FeedbackFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Please share a little feedback before submitting.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          sentiment,
          message: message.trim(),
          customerName: customerName.trim() || null,
          customerEmail: customerEmail.trim() || null,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/thanks");
    } catch {
      setError("We could not submit feedback right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        We will share this privately with the business so they can follow up or improve.
      </p>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-800">
          Tell us what happened
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          rows={4}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          placeholder="Share anything the business should know about your experience."
        />
        <p className="mt-1 text-xs text-slate-500">Location: {locationName}</p>
      </div>

      <div>
        <label htmlFor="customerName" className="mb-1.5 block text-sm font-medium text-slate-800">
          Your name (optional)
        </label>
        <input
          id="customerName"
          type="text"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <label htmlFor="customerEmail" className="mb-1.5 block text-sm font-medium text-slate-800">
          Your email (optional)
        </label>
        <input
          id="customerEmail"
          type="email"
          value={customerEmail}
          onChange={(event) => setCustomerEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          placeholder="you@example.com"
        />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Submitting..." : "Submit private feedback"}
      </button>
    </form>
  );
}
