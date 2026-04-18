import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-app-surface-muted bg-linear-to-br from-app-surface to-app-surface-muted/45">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-radial from-module-loyalty-solid/14 to-module-loyalty-solid/0" />
        <div className="absolute right-8 bottom-0 h-24 w-40 rounded-full bg-radial from-module-textback-border/28 to-module-textback-border/0" />
        <svg className="absolute right-16 top-3 h-12 w-28 opacity-55" viewBox="0 0 112 48" fill="none">
          <path className="stroke-module-scheduler-border/60" d="M8 40c16-12 28-18 48-18s32 6 48 18" strokeWidth="1.1" />
        </svg>
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-app-muted">
        <p>Copyright {year} AttuneBridge. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="font-medium text-app-text underline underline-offset-4">
            Terms
          </Link>
          <Link href="/privacy" className="font-medium text-app-text underline underline-offset-4">
            Privacy
          </Link>
          <Link href="/about" className="font-medium text-app-text underline underline-offset-4">
            About the Builder
          </Link>
        </nav>
      </div>
    </footer>
  );
}
