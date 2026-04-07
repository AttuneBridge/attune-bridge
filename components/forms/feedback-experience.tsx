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
  googleReviewLink: string | null;
  yelpReviewLink: string | null;
};

export function FeedbackExperience({
  slug,
  businessName,
  locationName,
  googleReviewLink,
  yelpReviewLink,
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
          <h2 className="text-base font-semibold text-emerald-900">Thanks for the great feedback!</h2>
          <p className="mb-3 mt-1 text-sm text-emerald-900">
            If you&apos;d be willing, sharing your experience publicly helps this business a lot.
          </p>
          {googleReviewLink || yelpReviewLink ? (
            <div className="flex flex-wrap gap-2">
              {googleReviewLink ? (
                <Link
                  href={`/api/reviews/redirect?slug=${encodeURIComponent(slug)}&channel=google`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                >
                  Leave a Google Review
                </Link>
              ) : null}
              {yelpReviewLink ? (
                <Link
                  href={`/api/reviews/redirect?slug=${encodeURIComponent(slug)}&channel=yelp`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  Leave a Yelp Review
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-emerald-900">
              Thanks again for the positive feedback. Public review links are not configured yet.
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
