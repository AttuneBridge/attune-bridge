import Link from "next/link";
import { headers } from "next/headers";
import { ModuleJourneyShowcase } from "@/components/marketing/module-journey-showcase";
import { Card } from "@/components/ui/card";
import { getDemoUrl, isDemoHost } from "@/lib/demo/config";

const moduleJourneyCards = [
  {
    tone: "reviews" as const,
    module: "Reviews",
    customerVoice:
      '"I was really excited to visit [Business Name] today, but they seemed understaffed and no one welcomed me when I walked in."',
    gap: "No private place to share a disappointing moment before posting publicly.",
    bridgeAction:
      "Enter Review Bridge: it captures this feedback privately, alerts the owner quickly, and gives the team a clear follow-up path.",
    realWorldOutcome:
      "A same-day recovery message turns a frustrated first-time guest into a returning client.",
    showNowLabel: "Show feedback inbox now",
    showNowPath: "/demo/feedback",
  },
  {
    tone: "textback" as const,
    module: "Missed-Call Textback",
    customerVoice:
      '"I called to ask a quick question, but no one picked up, so I figured they were too busy for new clients."',
    gap: "Warm leads drop when missed calls go unanswered.",
    bridgeAction:
      "Review Bridge sends an immediate textback so the customer feels acknowledged and can continue the conversation.",
    realWorldOutcome:
      "The client replies by text, books later that day, and never falls out of the funnel.",
    showNowLabel: "Show textback workflow now",
    showNowPath: "/dashboard/textback",
  },
  {
    tone: "scheduler" as const,
    module: "Scheduler",
    customerVoice:
      '"I wanted to come back, but I forgot to book and then my week filled up."',
    gap: "Interested clients do not always convert without a timely nudge.",
    bridgeAction:
      "Review Bridge uses sentiment + follow-up context to trigger targeted scheduling offers.",
    realWorldOutcome:
      "Open spots are filled with people who already trust the business.",
    showNowLabel: "Show scheduler board now",
    showNowPath: "/dashboard/scheduler",
  },
  {
    tone: "loyalty" as const,
    module: "Loyalty",
    customerVoice:
      '"I had a much better second visit, but I probably would not have remembered to come in again on my own."',
    gap: "Even happy clients churn when there is no structured repeat-visit rhythm.",
    bridgeAction:
      "Review Bridge queues loyalty reminders and return offers based on real visit cadence.",
    realWorldOutcome:
      "Repeat bookings become a system, not a guess, and revenue stabilizes month to month.",
    showNowLabel: "Show loyalty queue now",
    showNowPath: "/dashboard/loyalty",
  },
];

export default async function HomePage() {
  const requestHeaders = await headers();
  const isDemoExperience = isDemoHost(requestHeaders.get("host"));

  const guidedDemoHref = isDemoExperience ? "/demo-access" : getDemoUrl("/demo-access");
  const playbookHref = isDemoExperience ? "/playbook" : getDemoUrl("/playbook");
  const feedbackInboxHref = isDemoExperience ? "/demo/feedback" : getDemoUrl("/demo/feedback");
  const demoQrHref = isDemoExperience ? "/demo/qr" : getDemoUrl("/demo/qr");
  const moduleJourneyItems = moduleJourneyCards.map((item) => ({
    ...item,
    showNowHref: isDemoExperience ? item.showNowPath : getDemoUrl(item.showNowPath),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-stretch">
        <Card className="relative space-y-5 overflow-hidden border-module-textback-border/60 bg-linear-to-br from-app-surface to-module-textback-soft/35">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-14 top-2 h-44 w-44 rounded-full bg-radial from-module-textback-solid/16 to-module-textback-solid/0" />
            <div className="absolute right-8 bottom-3 h-24 w-36 rounded-full bg-radial from-module-textback-border/35 to-module-textback-border/0" />
          </div>

          <div className="relative">
            <p className="mb-2 inline-flex items-center rounded-full border border-module-textback-border bg-app-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-module-textback-solid">
              Narrative First
            </p>
          </div>

          <p className="relative text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            {isDemoExperience ? "Demo Workspace" : "Small Business Journey"}
          </p>
          <h1 className="relative font-display text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {isDemoExperience
              ? "Walk through every AttuneBridge tool in a seeded owner workspace."
              : "Turn customer moments into retained revenue before problems become public."}
          </h1>
          <p className="relative max-w-2xl text-slate-700">
            {isDemoExperience
              ? "Use this environment to demo Reviews, missed-call textback, Scheduler, and Loyalty workflows with realistic sample data."
              : "AttuneBridge helps service businesses capture private sentiment, recover at-risk clients, and launch timely follow-up campaigns so teams can protect reputation and grow repeat visits."}
          </p>
          <div className="relative flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={guidedDemoHref}
              target={isDemoExperience ? undefined : "_blank"}
              rel={isDemoExperience ? undefined : "noopener noreferrer"}
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              {isDemoExperience ? "Continue as Demo Owner" : "Open Interactive Demo"}
            </Link>
            <Link
              href="/signup"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Start Free Trial
            </Link>
            <p className="text-sm text-slate-600">
              {isDemoExperience
                ? "One click signs you into the seeded demo owner workspace."
                : "Interactive walkthroughs and playbooks live on the demo subdomain."}
            </p>
          </div>
        </Card>

        <Card className="relative space-y-3 overflow-hidden border-module-scheduler-border/65 bg-linear-to-br from-app-surface to-module-scheduler-soft/40">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 top-2 h-36 w-36 rounded-full bg-radial from-module-scheduler-solid/14 to-module-scheduler-solid/0" />
            <svg className="absolute left-4 bottom-4 h-20 w-20 opacity-60" viewBox="0 0 80 80" fill="none">
              <rect className="stroke-module-scheduler-border/55" x="10" y="12" width="60" height="56" rx="10" strokeWidth="1.2" />
              <path className="stroke-module-scheduler-border/55" d="M10 30h60" strokeWidth="1.2" />
            </svg>
          </div>

          <p className="relative inline-flex w-fit items-center rounded-full border border-module-scheduler-border bg-app-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-module-scheduler-solid">
            Story Flow
          </p>
          <h2 className="relative font-display text-lg font-semibold text-slate-900">Client Journey</h2>
          <ol className="relative space-y-3 text-sm text-slate-700">
            <li>1. Client shares post-visit sentiment in under a minute.</li>
            <li>2. Team triages issues privately and follows up by preferred channel.</li>
            <li>3. Positive moments route to review and loyalty opportunities.</li>
            <li>4. Follow-up playbooks drive second and third visits automatically.</li>
          </ol>
          <Link
            href={playbookHref}
            target={isDemoExperience ? undefined : "_blank"}
            rel={isDemoExperience ? undefined : "noopener noreferrer"}
            className="relative inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
          >
            {isDemoExperience ? "Open the guided playbook" : "Open the guided playbook on demo"}
          </Link>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="relative space-y-3 overflow-hidden border-module-reviews-border/65 bg-linear-to-r from-app-surface via-app-surface to-module-reviews-soft/38">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-radial from-module-reviews-solid/14 to-module-reviews-solid/0" />
            <div className="absolute right-1/4 top-2 h-16 w-56 rounded-full bg-radial from-module-reviews-border/35 to-module-reviews-border/0" />
          </div>
          <p className="relative inline-flex w-fit items-center rounded-full border border-module-reviews-border bg-app-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-module-reviews-solid">
            Outcome Lens
          </p>
          <h2 className="relative font-display text-xl font-semibold tracking-tight text-slate-900">
            How AttuneBridge helps owners
          </h2>
          <ul className="relative grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <li>- Catch churn risk before a public review is posted.</li>
            <li>- Give staff clear next actions for every negative or neutral response.</li>
            <li>- Trigger scheduler and loyalty workflows with less manual work.</li>
            <li>- Keep all owner-critical workflows in one dashboard.</li>
          </ul>
          <div className="relative flex flex-wrap gap-4 pt-1">
            <Link
              href={feedbackInboxHref}
              target={isDemoExperience ? undefined : "_blank"}
              rel={isDemoExperience ? undefined : "noopener noreferrer"}
              className="text-sm font-medium text-slate-900 underline underline-offset-4"
            >
              View demo feedback inbox
            </Link>
            <Link
              href={demoQrHref}
              target={isDemoExperience ? undefined : "_blank"}
              rel={isDemoExperience ? undefined : "noopener noreferrer"}
              className="text-sm font-medium text-slate-900 underline underline-offset-4"
            >
              View demo QR flow
            </Link>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4 overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Sales Enablement</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Customer journey by module</h2>
            <p className="text-sm text-slate-700">
              A focused, partner-ready walkthrough that keeps one module center stage while preserving the full story.
            </p>
          </div>

          <div className="-mx-6 rounded-2xl border-y border-app-surface-muted bg-linear-to-br from-app-surface-muted to-app-surface px-6 py-6 md:py-8">
            <ModuleJourneyShowcase
              items={moduleJourneyItems}
              intro="Switch between modules to present the same customer-to-outcome narrative with tighter visual focus and clearer conversion intent."
            />
          </div>
        </Card>
      </section>
    </main>
  );
}
