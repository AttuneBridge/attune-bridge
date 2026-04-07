import Link from "next/link";
import { Card } from "@/components/ui/card";

type ModuleTone = "reviews" | "textback" | "scheduler" | "loyalty";

function getModuleCardClass(tone: ModuleTone) {
  switch (tone) {
    case "reviews":
      return "border-rose-200 bg-rose-50";
    case "textback":
      return "border-teal-200 bg-teal-50";
    case "scheduler":
      return "border-amber-200 bg-amber-50";
    case "loyalty":
      return "border-violet-200 bg-violet-50";
    default:
      return "border-slate-200 bg-white";
  }
}

function getModuleAccentClass(tone: ModuleTone) {
  switch (tone) {
    case "reviews":
      return "text-rose-700";
    case "textback":
      return "text-teal-700";
    case "scheduler":
      return "text-amber-700";
    case "loyalty":
      return "text-violet-700";
    default:
      return "text-slate-900";
  }
}

function getModuleDotClass(tone: ModuleTone) {
  switch (tone) {
    case "reviews":
      return "bg-rose-600";
    case "textback":
      return "bg-teal-600";
    case "scheduler":
      return "bg-amber-600";
    case "loyalty":
      return "bg-violet-600";
    default:
      return "bg-slate-400";
  }
}

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
    showNowHref: "/demo/feedback",
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
    showNowHref: "/dashboard/textback",
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
    showNowHref: "/dashboard/scheduler",
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
    showNowHref: "/dashboard/loyalty",
  },
];

export default function HomePage() {
  const guidedDemoHref = "https://demo.attunebridge.com/demo-access";

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
              href={guidedDemoHref}
              target="_blank"
              rel="noopener noreferrer"
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

      <section className="mt-6">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Sales Enablement</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Customer journey by module</h2>
            <p className="text-sm text-slate-700">
              Start with real customer language, then show how each Review Bridge module fills a specific operational gap.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {moduleJourneyCards.map((item) => (
              <div key={item.module} className={`rounded-xl border p-4 ${getModuleCardClass(item.tone)}`}>
                <p className={`inline-flex items-center gap-2 text-sm font-semibold ${getModuleAccentClass(item.tone)}`}>
                  <span className={`inline-block size-2 rounded-full ${getModuleDotClass(item.tone)}`} aria-hidden />
                  {item.module}
                </p>
                <p className="mt-2 text-base italic text-slate-900">{item.customerVoice}</p>
                <p className={`mt-3 text-xs uppercase tracking-wide ${getModuleAccentClass(item.tone)}`}>Gap</p>
                <p className="text-sm text-slate-700">{item.gap}</p>
                <p className={`mt-2 text-xs uppercase tracking-wide ${getModuleAccentClass(item.tone)}`}>
                  Enter Review Bridge
                </p>
                <p className="text-sm text-slate-700">{item.bridgeAction}</p>
                <p className={`mt-2 text-xs uppercase tracking-wide ${getModuleAccentClass(item.tone)}`}>
                  Real-world result
                </p>
                <p className="text-sm text-slate-700">{item.realWorldOutcome}</p>
                <Link href={item.showNowHref} className={`mt-3 inline-flex text-sm font-medium underline ${getModuleAccentClass(item.tone)}`}>
                  {item.showNowLabel}
                </Link>
              </div>
            ))}
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
