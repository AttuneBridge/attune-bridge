"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PublicHeaderNavProps = {
  hasDashboardAccess: boolean;
};

function getLinkClass(isActive: boolean) {
  return isActive
    ? "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-900"
    : "hover:text-slate-900";
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
    <nav className="flex items-center gap-4 text-sm text-slate-700">
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
        <Link
          href="/dashboard"
          aria-current={isOwnerAreaActive ? "page" : undefined}
          className={getLinkClass(isOwnerAreaActive)}
        >
          Dashboard
        </Link>
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
