"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardModule = "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK";

type DashboardNavProps = {
  enabledModules: DashboardModule[];
};

const MODULE_LABELS: Record<DashboardModule, string> = {
  REVIEWS: "Reviews",
  SCHEDULER: "Last-Minute Scheduler",
  LOYALTY: "Loyalty Builder",
  MISSED_CALL_TEXTBACK: "Missed Call Text Back",
};

const MODULE_PATHS: Record<DashboardModule, string> = {
  REVIEWS: "/dashboard/reviews",
  SCHEDULER: "/dashboard/scheduler",
  LOYALTY: "/dashboard/loyalty",
  MISSED_CALL_TEXTBACK: "/dashboard/textback",
};

function getModuleActiveClass(module: DashboardModule) {
  switch (module) {
    case "REVIEWS":
      return "border-module-reviews-border bg-module-reviews-soft text-module-reviews-solid";
    case "SCHEDULER":
      return "border-module-scheduler-border bg-module-scheduler-soft text-module-scheduler-solid";
    case "LOYALTY":
      return "border-module-loyalty-border bg-module-loyalty-soft text-module-loyalty-solid";
    case "MISSED_CALL_TEXTBACK":
      return "border-module-textback-border bg-module-textback-soft text-module-textback-solid";
    default:
      return "border-app-surface-muted bg-app-surface text-app-text";
  }
}

function getModuleDotClass(module: DashboardModule) {
  switch (module) {
    case "REVIEWS":
      return "bg-module-reviews-solid";
    case "SCHEDULER":
      return "bg-module-scheduler-solid";
    case "LOYALTY":
      return "bg-module-loyalty-solid";
    case "MISSED_CALL_TEXTBACK":
      return "bg-module-textback-solid";
    default:
      return "bg-app-muted";
  }
}

export function DashboardNav({ enabledModules }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-app-surface-muted bg-app-surface-muted">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-2.5 text-sm text-app-muted">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Owner Dashboard</p>
        <nav className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={
              pathname === "/dashboard"
                ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
                : "text-app-muted hover:text-app-text"
            }
          >
            Dashboard
          </Link>

          {enabledModules.map((module) => {
            const href = MODULE_PATHS[module];
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={module}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? `inline-flex items-center rounded-full border px-2.5 py-1 ${getModuleActiveClass(module)}`
                    : "inline-flex items-center text-app-muted hover:text-app-text"
                }
              >
                <span className={`mr-1.5 inline-block size-2 rounded-full ${getModuleDotClass(module)}`} aria-hidden />
                {MODULE_LABELS[module]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
