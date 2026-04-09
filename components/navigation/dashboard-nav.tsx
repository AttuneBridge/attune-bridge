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
  const isToolsRoute = pathname === "/dashboard/tools" || pathname.startsWith("/dashboard/tools/");

  const toolsTabs = [
    ...(enabledModules.includes("MISSED_CALL_TEXTBACK")
      ? [{ module: "MISSED_CALL_TEXTBACK" as const, href: "/dashboard/tools/textback" }]
      : []),
    ...(enabledModules.includes("SCHEDULER")
      ? [{ module: "SCHEDULER" as const, href: "/dashboard/tools/scheduler" }]
      : []),
    ...(enabledModules.includes("REVIEWS")
      ? [{ module: "REVIEWS" as const, href: "/dashboard/tools/reviews" }]
      : []),
    ...(enabledModules.includes("LOYALTY")
      ? [{ module: "LOYALTY" as const, href: "/dashboard/tools/loyalty" }]
      : []),
    { module: null, href: "/dashboard/tools/contacts", label: "Contacts" },
  ];

  return (
    <div className="border-b border-app-surface-muted bg-app-surface-muted">
      <div className="mx-auto w-full max-w-5xl px-4 py-2.5 text-sm text-app-muted">
        <div className="flex items-center justify-between gap-4">
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
              Home
            </Link>

            <Link
              href="/dashboard/tools"
              aria-current={isToolsRoute ? "page" : undefined}
              className={
                isToolsRoute
                  ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
                  : "text-app-muted hover:text-app-text"
              }
            >
              Tools
            </Link>

            <Link
              href="/dashboard/insights"
              aria-current={pathname === "/dashboard/insights" ? "page" : undefined}
              className={
                pathname === "/dashboard/insights"
                  ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
                  : "text-app-muted hover:text-app-text"
              }
            >
              Insights
            </Link>

            <Link
              href="/dashboard/settings"
              aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
              className={
                pathname === "/dashboard/settings"
                  ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
                  : "text-app-muted hover:text-app-text"
              }
            >
              Settings
            </Link>
          </nav>
        </div>

        {isToolsRoute ? (
          <nav className="mt-2 flex flex-wrap items-center gap-3 border-t border-app-surface-muted pt-2">
            {toolsTabs.map((tab) => {
              if (tab.module === null) {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
                        : "text-app-muted hover:text-app-text"
                    }
                  >
                    {tab.label}
                  </Link>
                );
              }

              const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

              return (
                <Link
                  key={tab.module}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? `inline-flex items-center rounded-full border px-2.5 py-1 ${getModuleActiveClass(tab.module)}`
                      : "inline-flex items-center text-app-muted hover:text-app-text"
                  }
                >
                  <span className={`mr-1.5 inline-block size-2 rounded-full ${getModuleDotClass(tab.module)}`} aria-hidden />
                  {MODULE_LABELS[tab.module]}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
