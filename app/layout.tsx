import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewBridge",
  description: "Capture private feedback before public reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white/95">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
              ReviewBridge
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-700">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <Link href="/feedback/demo-coffee-downtown" className="hover:text-slate-900">
                Try Demo
              </Link>
              <Link href="/demo/feedback" className="hover:text-slate-900">
                Demo Feedback View
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
