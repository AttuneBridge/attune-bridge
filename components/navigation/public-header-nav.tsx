"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PublicHeaderNavProps = {
  hasDashboardAccess: boolean;
};

function getLinkClass(isActive: boolean) {
  return isActive
    ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
    : "text-app-muted hover:text-app-text";
}

export function PublicHeaderNav({ hasDashboardAccess }: PublicHeaderNavProps) {
  const pathname = usePathname();

  const isHomeActive = pathname === "/";
  const isTryDemoActive =
    pathname === "/demo-access" || pathname === "/feedback/demo-coffee-downtown" || pathname.startsWith("/demo/");
  const isPlaybookActive = pathname === "/playbook" || pathname.startsWith("/playbook/");
  const isStartTrialActive = pathname === "/signup" || pathname.startsWith("/signup/");
  const isOwnerAreaActive =
    pathname.startsWith("/manage/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/");

  return (
    <nav className="flex items-center gap-4 text-sm text-app-muted">
      <Link href="/" aria-current={isHomeActive ? "page" : undefined} className={getLinkClass(isHomeActive)}>
        Home
      </Link>
      <Link
        href="/demo-access"
        aria-current={isTryDemoActive ? "page" : undefined}
        className={getLinkClass(isTryDemoActive)}
      >
        Try Demo
      </Link>
      <Link
        href="/playbook"
        aria-current={isPlaybookActive ? "page" : undefined}
        className={getLinkClass(isPlaybookActive)}
      >
        Playbook
      </Link>
      <Link
        href="/signup"
        aria-current={isStartTrialActive ? "page" : undefined}
        className={getLinkClass(isStartTrialActive)}
      >
        Start Trial
      </Link>

      {hasDashboardAccess ? (
        <form action="/api/auth/sign-out" method="post">
          <button type="submit" className={getLinkClass(isOwnerAreaActive)}>
            Sign Out
          </button>
        </form>
      ) : (
        <Link
          href="/access"
          aria-current={isOwnerAreaActive ? "page" : undefined}
          className={getLinkClass(isOwnerAreaActive)}
        >
          Sign In
        </Link>
      )}
    </nav>
  );
}
