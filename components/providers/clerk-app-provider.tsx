"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

type ClerkAppProviderProps = {
  children: ReactNode;
};

export function ClerkAppProvider({ children }: ClerkAppProviderProps) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
