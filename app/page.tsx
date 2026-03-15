import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Validation Prototype
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Capture private feedback before unhappy customers post public reviews.
          </h1>
          <p className="text-slate-700">
            ReviewBridge gives service businesses a fast customer feedback checkpoint. Happy
            customers are invited to leave a public review, while unhappy customers are routed into
            a private feedback path first.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/feedback/demo-coffee-downtown"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try the demo
            </Link>
            <p className="text-sm text-slate-600">
              Private feedback for concerns. Public review CTA for positive experiences.
            </p>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <li>1. Customer shares a quick sentiment after their visit.</li>
            <li>2. Neutral or negative responses go to a private feedback form.</li>
            <li>3. Positive responses get a link to leave a public review.</li>
          </ol>
          <Link
            href="/feedback/demo-coffee-downtown"
            className="inline-flex text-sm font-medium text-slate-900 underline"
          >
            Open seeded demo page
          </Link>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            The problem this solves
          </h2>
          <p className="text-slate-700">
            Most small businesses only hear about bad experiences when a public review appears.
            ReviewBridge creates a short, private moment for dialogue before that happens so teams
            can recover trust and improve service.
          </p>
          <div>
            <Link href="/demo/feedback" className="text-sm font-medium text-slate-900 underline">
              View the business-side demo feedback inbox
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
