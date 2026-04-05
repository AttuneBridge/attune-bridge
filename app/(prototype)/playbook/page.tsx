import Link from "next/link";
import { Card } from "@/components/ui/card";

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

export default function PlaybookPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-start">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Guided Demo Talk Track</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Small business + client journey walkthrough</h1>
          <ol className="space-y-3 text-sm text-slate-700">
            <li>1. Open the owner workspace from demo access.</li>
            <li>2. Start in Reviews to show private sentiment capture and triage.</li>
            <li>3. Show Scheduler to fill last-minute capacity from opted-in contacts.</li>
            <li>4. Open Loyalty to show follow-up automation and repeat-visit nudges.</li>
            <li>5. Finish with outcomes: recovered trust, protected reviews, more repeat bookings.</li>
          </ol>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/demo-access"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Continue as Demo Owner
            </Link>
            <Link
              href="/feedback/demo-coffee-downtown"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Open customer form
            </Link>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">What to highlight</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>- Immediate owner visibility into neutral/negative feedback.</li>
            <li>- Preferred channel response actions (email, text, call).</li>
            <li>- Loyalty queue and conversions tied to real feedback signals.</li>
            <li>- Daily demo reset keeps every walkthrough consistent.</li>
          </ul>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Persona variants</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {personas.map((persona) => (
              <div key={persona.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{persona.title}</p>
                <p className="mt-1 text-sm text-slate-700">{persona.summary}</p>
                <p className="mt-2 text-xs text-slate-600">Outcome: {persona.outcome}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
