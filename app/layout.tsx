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
      <body className="theme-muted-neutral min-h-screen bg-app-bg text-app-text">
        <ClerkAppProvider>{children}</ClerkAppProvider>
      </body>
    </html>
  );
}
