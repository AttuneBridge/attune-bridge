import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <section className="rounded-2xl border border-app-surface-muted bg-app-surface p-6 md:p-8">
        <p className="inline-flex rounded-full border border-module-scheduler-border bg-module-scheduler-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-module-scheduler-solid">
          Placeholder
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-app-text">Terms of Service</h1>
        <p className="mt-3 text-sm text-app-muted">
          Full terms are being finalized. This placeholder page reserves the route and footer link.
        </p>
        <p className="mt-2 text-sm text-app-muted">
          For questions, contact the builder through the about page while legal content is prepared.
        </p>
        <Link href="/about" className="mt-5 inline-flex text-sm font-medium text-app-text underline underline-offset-4">
          Go to About the Builder
        </Link>
      </section>
    </main>
  );
}
