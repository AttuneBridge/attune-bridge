"use client";

import { SignInButton } from "@clerk/nextjs";

type OwnerDashboardSignInButtonProps = {
  returnTo: string;
};

export function OwnerDashboardSignInButton({ returnTo }: OwnerDashboardSignInButtonProps) {
  return (
    <SignInButton mode="modal" fallbackRedirectUrl={returnTo} forceRedirectUrl={returnTo}>
      <button
        type="button"
        className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Sign in to dashboard
      </button>
    </SignInButton>
  );
}
