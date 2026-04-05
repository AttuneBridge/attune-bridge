"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OwnerSignoutButton } from "@/components/forms/owner-signout-button";

type PublicHeaderNavProps = {
  hasDashboardAccess: boolean;
  hasLegacyOwnerSession: boolean;
};

function getLinkClass(isActive: boolean) {
  return isActive
    ? "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-900"
    : "hover:text-slate-900";
}

export function PublicHeaderNav({ hasDashboardAccess, hasLegacyOwnerSession }: PublicHeaderNavProps) {
  const pathname = usePathname();

  const isHomeActive = pathname === "/";
  const isTryDemoActive = pathname === "/feedback/demo-coffee-downtown" || pathname.startsWith("/demo/");
  const isStartTrialActive = pathname === "/signup" || pathname.startsWith("/signup/");
  const isOwnerAreaActive =
    pathname.startsWith("/manage/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/");

  return (
    <nav className="flex items-center gap-4 text-sm text-slate-700">
      <Link href="/" aria-current={isHomeActive ? "page" : undefined} className={getLinkClass(isHomeActive)}>
        Home
      </Link>
      <Link
        href="/feedback/demo-coffee-downtown"
        aria-current={isTryDemoActive ? "page" : undefined}
        className={getLinkClass(isTryDemoActive)}
      >
        Try Demo
      </Link>
      <Link
        href="/signup"
        aria-current={isStartTrialActive ? "page" : undefined}
        className={getLinkClass(isStartTrialActive)}
      >
        Start Trial
      </Link>

      {hasDashboardAccess ? (
        <>
          <Link
            href="/dashboard"
            aria-current={isOwnerAreaActive ? "page" : undefined}
            className={getLinkClass(isOwnerAreaActive)}
          >
            Dashboard
          </Link>
          {hasLegacyOwnerSession ? <OwnerSignoutButton /> : null}
        </>
      ) : (
        <Link
          href="/dashboard/access"
          aria-current={isOwnerAreaActive ? "page" : undefined}
          className={getLinkClass(isOwnerAreaActive)}
        >
          Dashboard Access
        </Link>
      )}
    </nav>
  );
}
