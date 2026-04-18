import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <section className="rounded-2xl border border-app-surface-muted bg-app-surface p-6 md:p-8">
        <p className="inline-flex rounded-full border border-module-textback-border bg-module-textback-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-module-textback-solid">
          Placeholder
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-app-text">Privacy Policy</h1>
        <p className="mt-3 text-sm text-app-muted">
          Full privacy details are being prepared. This placeholder page reserves the route and footer link.
        </p>
        <p className="mt-2 text-sm text-app-muted">
          For now, use this as a temporary legal endpoint until policy language is finalized.
        </p>
        <Link href="/about" className="mt-5 inline-flex text-sm font-medium text-app-text underline underline-offset-4">
          Go to About the Builder
        </Link>
      </section>
    </main>
  );
}
