import { FeedbackStatus, RecoveryOutcome, Sentiment } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

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
      </div>
    </main>
  );
}
