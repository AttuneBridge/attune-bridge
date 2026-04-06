import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FeedbackInboxList } from "@/components/reviews/feedback-inbox-list";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

export default async function DashboardFeedbackInboxPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();

  const feedbackEntries = await prisma.feedback.findMany({
    where: {
      location: {
        businessId: workspace.businessId,
      },
    },
    include: {
      location: {
        include: {
          business: {
            select: {
              name: true,
            },
          },
        },
      },
      notificationEvents: {
        select: {
          channel: true,
          status: true,
          reason: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
  });

  const serializedEntries = feedbackEntries.map((entry) => ({
    id: entry.id,
    sentiment: entry.sentiment,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    message: entry.message,
    wantsFollowUp: entry.wantsFollowUp,
    followUpPreference: entry.followUpPreference,
    customerName: entry.customerName,
    customerEmail: entry.customerEmail,
    phone: entry.phone,
    location: {
      name: entry.location.name,
      business: {
        name: entry.location.business.name,
      },
    },
    notificationEvents: entry.notificationEvents.map((event) => ({
      channel: event.channel,
      status: event.status,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reviews Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Recent Private Feedback</h1>
          <p className="text-sm text-slate-600">Customer feedback inbox for {workspace.businessName}.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/feedback/${workspace.locationSlug}`}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
          >
            Preview customer form
          </Link>
          <Link
            href="/dashboard/reviews/qr"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
          >
            Open business QR code
          </Link>
        </div>

        {feedbackEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-sm text-slate-700">
              No feedback yet. New submissions from your customer form will appear here.
            </p>
          </div>
        ) : (
          <FeedbackInboxList entries={serializedEntries} />
        )}
      </Card>
    </main>
  );
}
