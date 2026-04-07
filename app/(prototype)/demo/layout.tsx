import Link from "next/link";

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="border-b border-app-surface-muted bg-app-surface-muted">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs">
          <p className="font-semibold uppercase tracking-[0.14em] text-app-muted">Demo Area</p>
          <nav className="flex items-center gap-4 text-sm text-app-muted">
            <Link href="/demo/feedback" className="hover:text-app-text">
              Feedback Inbox
            </Link>
            <Link href="/demo/qr" className="hover:text-app-text">
              QR
            </Link>
            <Link href="/demo/settings" className="hover:text-app-text">
              Alerts
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
