"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

type OwnerDashboardSignInButtonProps = {
  returnTo: string;
};

export function OwnerDashboardSignInButton({ returnTo }: OwnerDashboardSignInButtonProps) {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal" fallbackRedirectUrl={returnTo} forceRedirectUrl={returnTo}>
          <button
            type="button"
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign in to dashboard
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link
          href={returnTo}
          className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Continue to dashboard
        </Link>
      </SignedIn>
    </>
  );
}
