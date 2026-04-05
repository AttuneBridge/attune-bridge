import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Small Business Journey Playbook
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Turn customer moments into retained revenue before problems become public.
          </h1>
          <p className="text-slate-700">
            AttuneBridge helps service businesses capture private sentiment, recover at-risk clients,
            and launch timely follow-up campaigns so teams can protect reputation and grow repeat
            visits.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/demo-access"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              View Guided Demo
            </Link>
            <Link
              href="/signup"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Start Trial
            </Link>
            <p className="text-sm text-slate-600">
              One-click seeded owner workspace for live walkthroughs.
            </p>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Client Journey</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <li>1. Client shares post-visit sentiment in under a minute.</li>
            <li>2. Team triages issues privately and follows up by preferred channel.</li>
            <li>3. Positive moments route to review and loyalty opportunities.</li>
            <li>4. Follow-up playbooks drive second and third visits automatically.</li>
          </ol>
          <Link
            href="/playbook"
            className="inline-flex text-sm font-medium text-slate-900 underline"
          >
            Open the guided playbook
          </Link>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            How AttuneBridge helps owners
          </h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>- Catch churn risk before a public review is posted.</li>
            <li>- Give staff clear next actions for every negative or neutral response.</li>
            <li>- Trigger scheduler and loyalty workflows with less manual work.</li>
            <li>- Keep all owner-critical workflows in one dashboard.</li>
          </ul>
          <div className="flex flex-wrap gap-4 pt-1">
            <Link href="/demo/feedback" className="text-sm font-medium text-slate-900 underline">
              View demo feedback inbox
            </Link>
            <Link href="/demo/qr" className="text-sm font-medium text-slate-900 underline">
              View demo QR flow
            </Link>
          </div>
        </Card>
      </section>

      <footer className="mt-24 text-center text-sm text-slate-500">
        <Link href="/about" target="_blank" rel="noopener noreferrer" className="hover:underline">
          About the Builder
        </Link>
      </footer>
    </main>
  );
}
