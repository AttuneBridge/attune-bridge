import { FollowUpPreference, Sentiment } from "@prisma/client";
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

function formatFollowUpPreference(preference: FollowUpPreference | null) {
  if (!preference) {
    return null;
  }

  return preference.charAt(0) + preference.slice(1).toLowerCase();
}

export default async function DemoFeedbackPage() {
  let feedbackEntries: Array<{
    id: string;
    sentiment: Sentiment;
    message: string | null;
    customerName: string | null;
    customerEmail: string | null;
    wantsFollowUp: boolean;
    followUpPreference: FollowUpPreference | null;
    phone: string | null;
    createdAt: Date;
    location: {
      name: string;
      business: {
        name: string;
      };
    };
  }> = [];

  try {
    feedbackEntries = await prisma.feedback.findMany({
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
  } catch {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <Card className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Recent Private Feedback
          </h1>
          <p className="text-sm text-slate-600">
            Demo inbox is unavailable until the database is configured.
          </p>
          <p className="text-sm text-slate-600">
            Add <code>DATABASE_URL</code> to <code>.env</code>, then run migrations and seed data.
          </p>
        </Card>
      </main>
    );
  }

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

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {entry.wantsFollowUp ? (
                    <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-medium text-indigo-800">
                      Follow-up requested
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                      No follow-up requested
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>Customer name: {entry.customerName || "(not provided)"}</p>
                  <p>Customer email: {entry.customerEmail || "(not provided)"}</p>
                  <p>
                    Preferred contact method: {formatFollowUpPreference(entry.followUpPreference) || "(none)"}
                  </p>
                  <p>Phone: {entry.phone || "(not provided)"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
