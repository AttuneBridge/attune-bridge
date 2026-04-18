import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-app-surface-muted bg-linear-to-br from-app-surface to-app-surface-muted/45">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-radial from-module-loyalty-solid/14 to-module-loyalty-solid/0" />
        <svg className="absolute -left-1 top-2 h-20 w-20 opacity-30 md:opacity-42 lg:opacity-58" viewBox="0 0 80 80" fill="none">
          <circle className="stroke-module-loyalty-border/60" cx="40" cy="40" r="6" strokeWidth="1" />
          <circle className="stroke-module-loyalty-border/60" cx="40" cy="40" r="12" strokeWidth="1" />
          <circle className="stroke-module-loyalty-border/60" cx="40" cy="40" r="18" strokeWidth="1" />
          <circle className="stroke-module-loyalty-border/60" cx="40" cy="40" r="24" strokeWidth="1" strokeDasharray="2 4" />
          <circle className="stroke-module-loyalty-border/60" cx="40" cy="40" r="30" strokeWidth="1" strokeDasharray="2 5" />
          <circle className="stroke-module-loyalty-border/60" cx="40" cy="40" r="36" strokeWidth="1" strokeDasharray="3 6" />
        </svg>
        <div className="absolute right-8 bottom-0 h-32 w-32 rounded-full bg-radial from-module-textback-border/28 to-module-textback-border/0" />
        <svg className="absolute right-16 top-3 h-12 w-28 opacity-30 md:opacity-42 lg:opacity-56" viewBox="0 0 112 48" fill="none">
          <path className="stroke-module-scheduler-border/60" d="M8 40c16-12 28-18 48-18s32 6 48 18" strokeWidth="1.1" />
        </svg>
        <svg className="absolute right-20 bottom-1 h-8 w-36 opacity-28 md:opacity-40 lg:opacity-54" viewBox="0 0 144 32" fill="none">
          <path className="stroke-module-textback-border/60" d="M0 16c4-8 8-8 12 0s8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0" strokeWidth="1" />
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
