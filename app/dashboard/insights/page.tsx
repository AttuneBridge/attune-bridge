import { FeedbackStatus, RecoveryOutcome, Sentiment } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";
import { validationEvent } from "@/lib/validation-events";

async function withFallback<T>(label: string, action: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.error(`[dashboard-insights] ${label} failed`, error);
    return fallback;
  }
}

export default async function DashboardInsightsPage() {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const now = Date.now();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [feedbackVolume, privateCases, resolvedCases, recoveredCases, reviewRedirects, openCases] =
    await withFallback(
      "insights-metrics",
      () =>
        Promise.all([
          prisma.feedback.count({
            where: {
              location: { businessId: workspace.businessId },
              createdAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.feedback.count({
            where: {
              location: { businessId: workspace.businessId },
              sentiment: { in: [Sentiment.NEUTRAL, Sentiment.NEGATIVE] },
              createdAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.feedback.count({
            where: {
              location: { businessId: workspace.businessId },
              status: FeedbackStatus.RESOLVED,
              resolvedAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.feedback.count({
            where: {
              location: { businessId: workspace.businessId },
              recoveryOutcome: RecoveryOutcome.SAVED,
              resolvedAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.validationEvent.count({
            where: {
              businessId: workspace.businessId,
              event: "review_redirect_opened",
              createdAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.feedback.count({
            where: {
              location: { businessId: workspace.businessId },
              status: { in: [FeedbackStatus.NEW, FeedbackStatus.IN_PROGRESS] },
            },
          }),
        ]),
      [0, 0, 0, 0, 0, 0],
    );

  const savedRate = resolvedCases === 0 ? 0 : Math.round((recoveredCases / resolvedCases) * 100);

  const [reaskEligibleCases, reaskEvents, reviewRedirectEvents] = await withFallback(
    "reputation-pipeline-metrics",
    () =>
      Promise.all([
        prisma.feedback.count({
          where: {
            location: { businessId: workspace.businessId },
            sentiment: { in: [Sentiment.NEUTRAL, Sentiment.NEGATIVE] },
            status: FeedbackStatus.RESOLVED,
            recoveryOutcome: RecoveryOutcome.SAVED,
            resolvedAt: {
              gte: thirtyDaysAgo,
              lte: new Date(now - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.validationEvent.findMany({
          where: {
            businessId: workspace.businessId,
            event: validationEvent.reviewsReaskSent,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: {
            metadata: true,
          },
          take: 500,
        }),
        prisma.validationEvent.findMany({
          where: {
            businessId: workspace.businessId,
            event: validationEvent.reviewRedirectOpened,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: {
            metadata: true,
          },
          take: 500,
        }),
      ]),
    [0, [], []],
  );

  const reaskChannelMap = new Map<string, number>();
  for (const event of reaskEvents) {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;
    const channel = typeof metadata?.channel === "string" ? metadata.channel.toUpperCase() : "UNKNOWN";
    reaskChannelMap.set(channel, (reaskChannelMap.get(channel) ?? 0) + 1);
  }

  const redirectSourceMap = new Map<string, number>();
  for (const event of reviewRedirectEvents) {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;
    const source = typeof metadata?.channel === "string" ? metadata.channel.toLowerCase() : "unknown";
    redirectSourceMap.set(source, (redirectSourceMap.get(source) ?? 0) + 1);
  }

  const reaskSentCount = reaskEvents.length;
  const reaskCoveragePercent = reaskEligibleCases === 0 ? 0 : Math.round((reaskSentCount / reaskEligibleCases) * 100);
  const redirectsAfterReaskRatio = reaskSentCount === 0 ? 0 : Math.round((reviewRedirects / reaskSentCount) * 10) / 10;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Insights</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">30-day performance snapshot</h1>
          <p className="text-sm text-slate-700">A focused readout of reputation and recovery outcomes.</p>
        </Card>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Feedback volume</p>
            <p className="text-2xl font-semibold text-slate-900">{feedbackVolume}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Private cases</p>
            <p className="text-2xl font-semibold text-slate-900">{privateCases}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Resolved cases</p>
            <p className="text-2xl font-semibold text-slate-900">{resolvedCases}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Recovered (Saved)</p>
            <p className="text-2xl font-semibold text-emerald-700">{recoveredCases}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Saved rate</p>
            <p className="text-2xl font-semibold text-slate-900">{savedRate}%</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Review redirects</p>
            <p className="text-2xl font-semibold text-slate-900">{reviewRedirects}</p>
          </Card>
        </section>

        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Open queue</p>
          <p className="text-2xl font-semibold text-slate-900">{openCases}</p>
          <p className="text-sm text-slate-600">Current unresolved private feedback cases across the workspace.</p>
        </Card>

        <Card className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Reputation pipeline</p>
            <p className="text-sm text-slate-700">Recovered-case re-ask and redirect funnel health (30 days).</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Re-ask eligible</p>
              <p className="text-2xl font-semibold text-slate-900">{reaskEligibleCases}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Re-ask sent</p>
              <p className="text-2xl font-semibold text-slate-900">{reaskSentCount}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Re-ask coverage</p>
              <p className="text-2xl font-semibold text-slate-900">{reaskCoveragePercent}%</p>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Re-ask channel mix</p>
              {reaskChannelMap.size === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No re-ask sends captured yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {[...reaskChannelMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([channel, count]) => (
                      <span
                        key={channel}
                        className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700"
                      >
                        {channel}: {count}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Redirect source mix</p>
              <p className="mt-1 text-xs text-slate-600">Redirects per re-ask: {redirectsAfterReaskRatio}</p>
              {redirectSourceMap.size === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No public review redirects captured yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {[...redirectSourceMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => (
                      <span
                        key={source}
                        className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700"
                      >
                        {source}: {count}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
