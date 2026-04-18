import Link from "next/link";
import { ModuleJourneyShowcase } from "@/components/marketing/module-journey-showcase";
import { Card } from "@/components/ui/card";
import { getDemoUrl } from "@/lib/demo/config";

const personas = [
  {
    title: "Salon Owner",
    summary: "Color client leaves neutral feedback after a long wait.",
    outcome: "Owner follows up quickly, offers recovery slot, prevents churn.",
  },
  {
    title: "Dental Practice",
    summary: "Patient signals frustration about front-desk delays.",
    outcome: "Staff closes the case and queues a loyalty return reminder.",
  },
  {
    title: "Medspa Team",
    summary: "Guest reports confusion about treatment aftercare.",
    outcome: "Provider reaches out privately and secures follow-up booking.",
  },
];

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

export default function PlaybookPage() {
  const moduleJourneyItems = moduleJourneyCards.map((item) => ({
    ...item,
    showNowHref: getDemoUrl(item.showNowPath),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-start">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-app-muted">Guided Demo Talk Track</p>
          <h1 className="text-3xl font-semibold tracking-tight text-app-text">Small business + client journey walkthrough</h1>
          <ol className="space-y-3 text-sm text-app-muted">
            <li>1. Open the owner workspace from demo access.</li>
            <li>2. Start in Reviews to show private sentiment capture and triage.</li>
            <li>3. Show Scheduler to fill last-minute capacity from opted-in contacts.</li>
            <li>4. Open Loyalty to show follow-up automation and repeat-visit nudges.</li>
            <li>5. Finish with outcomes: recovered trust, protected reviews, more repeat bookings.</li>
          </ol>
          <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={getDemoUrl("/demo-access")}
                className="inline-flex rounded-lg bg-app-text px-4 py-2.5 text-sm font-medium text-app-bg hover:opacity-90"
              >
                Continue as Demo Owner
              </Link>
              <Link
                href={getDemoUrl("/feedback/demo-coffee-downtown")}
                className="inline-flex rounded-lg border border-app-surface-muted bg-app-surface px-4 py-2.5 text-sm font-medium text-app-text hover:bg-app-surface-muted"
              >
                Open customer form
            </Link>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-app-text">What to highlight</h2>
          <ul className="space-y-2 text-sm text-app-muted">
            <li>- Immediate owner visibility into neutral/negative feedback.</li>
            <li>- Preferred channel response actions (email, text, call).</li>
            <li>- Loyalty queue and conversions tied to real feedback signals.</li>
            <li>- Daily demo reset keeps every walkthrough consistent.</li>
          </ul>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4 overflow-hidden">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-app-muted">Sales Enablement</p>
            <h2 className="text-xl font-semibold tracking-tight text-app-text">Customer voice journey by module</h2>
            <p className="text-sm text-app-muted">
              Use one focused panel at a time to connect customer voice, operational gap, and measurable outcome.
            </p>
          </div>

          <div className="-mx-6 rounded-2xl border-y border-app-surface-muted bg-linear-to-br from-app-surface-muted to-app-surface px-6 py-6 md:py-8">
            <ModuleJourneyShowcase
              items={moduleJourneyItems}
              intro="Lead with a partner conversation: pick one module, narrate the problem in customer language, then tie it to a clear business outcome."
            />
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-app-text">Persona variants</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {personas.map((persona) => (
              <div key={persona.title} className="rounded-xl border border-app-surface-muted bg-app-surface-muted p-4">
                <p className="text-sm font-semibold text-app-text">{persona.title}</p>
                <p className="mt-1 text-sm text-app-muted">{persona.summary}</p>
                <p className="mt-2 text-xs text-app-muted">Outcome: {persona.outcome}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
