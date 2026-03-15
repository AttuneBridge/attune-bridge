import { Sentiment } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sentimentStyles: Record<Sentiment, string> = {
  POSITIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  NEUTRAL: "bg-amber-100 text-amber-800 border-amber-200",
  NEGATIVE: "bg-rose-100 text-rose-800 border-rose-200",
};

function formatSentiment(sentiment: Sentiment) {
  return sentiment.charAt(0) + sentiment.slice(1).toLowerCase();
}

export default async function DemoFeedbackPage() {
  const feedbackEntries = await prisma.feedback.findMany({
    include: {
      location: {
        include: {
          business: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Recent Private Feedback
          </h1>
          <p className="text-sm text-slate-600">
            Lightweight demo inbox showing what a business owner receives.
          </p>
        </div>

        {feedbackEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-sm text-slate-700">
              No feedback yet. Submit a response in the demo flow to populate this page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${sentimentStyles[entry.sentiment]}`}
                  >
                    {formatSentiment(entry.sentiment)}
                  </span>
                  <p className="text-sm font-medium text-slate-900">
                    {entry.location.business.name} - {entry.location.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>

                <p className="text-sm text-slate-800">
                  {entry.message?.trim() || "(No message provided)"}
                </p>

                {(entry.customerName || entry.customerEmail) && (
                  <p className="mt-2 text-xs text-slate-600">
                    From: {entry.customerName || "Anonymous"}
                    {entry.customerEmail ? ` (${entry.customerEmail})` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
