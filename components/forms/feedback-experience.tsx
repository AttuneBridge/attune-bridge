"use client";

import Link from "next/link";
import { useState } from "react";
import { FeedbackForm } from "@/components/forms/feedback-form";
import { SentimentSelector } from "@/components/forms/sentiment-selector";

type SentimentChoice = "positive" | "neutral" | "negative";

type FeedbackExperienceProps = {
  slug: string;
  businessName: string;
  locationName: string;
  reviewLink: string | null;
};

export function FeedbackExperience({
  slug,
  businessName,
  locationName,
  reviewLink,
}: FeedbackExperienceProps) {
  const [sentiment, setSentiment] = useState<SentimentChoice | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-800">Select one option to continue:</p>
        <SentimentSelector value={sentiment} onChange={setSentiment} />
      </div>

      {sentiment === "positive" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-3 text-sm text-emerald-900">
            Thanks for sharing. If you are open to it, a public review helps {businessName} a lot.
          </p>
          {reviewLink ? (
            <Link
              href={reviewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Leave a public review
            </Link>
          ) : (
            <p className="text-sm text-emerald-900">
              Thanks again for the positive feedback. A public review link is not configured yet.
            </p>
          )}
        </div>
      ) : null}

      {sentiment === "neutral" || sentiment === "negative" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm text-slate-700">
            Thanks for sharing this. Your message will be shared privately with {businessName} so
            they can follow up or improve.
          </p>
          <FeedbackForm slug={slug} sentiment={sentiment} locationName={locationName} />
        </div>
      ) : null}
    </div>
  );
}
