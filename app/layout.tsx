import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { ClerkAppProvider } from "@/components/providers/clerk-app-provider";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AttuneBridge",
  description: "Capture private feedback before public reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="theme-muted-neutral min-h-screen bg-app-bg text-app-text">
        <ClerkAppProvider>{children}</ClerkAppProvider>
      </body>
    </html>
  );
}
