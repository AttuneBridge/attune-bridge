import type { Metadata } from "next";
import "./globals.css";
import { ClerkAppProvider } from "@/components/providers/clerk-app-provider";

export const metadata: Metadata = {
  title: "AttuneBridge",
  description: "Capture private feedback before public reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ClerkAppProvider>{children}</ClerkAppProvider>
      </body>
    </html>
  );
}
