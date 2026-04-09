"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardModule = "FEEDBACK" | "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK";

type OwnerWorkspaceNavProps = {
  locationSlug: string;
  enabledModules: DashboardModule[];
};

const MODULE_LABELS: Record<DashboardModule, string> = {
  FEEDBACK: "Reviews",
  REVIEWS: "Reviews",
  SCHEDULER: "Last-Minute Scheduler",
  LOYALTY: "Loyalty Builder",
  MISSED_CALL_TEXTBACK: "Missed Call Text Back",
};

function getModuleActiveClass(module: DashboardModule) {
  switch (module) {
    case "FEEDBACK":
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
    case "FEEDBACK":
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

export function OwnerWorkspaceNav({ locationSlug, enabledModules }: OwnerWorkspaceNavProps) {
  const pathname = usePathname();
  const isFeedbackRoute =
    pathname.startsWith("/dashboard/reviews") ||
    pathname.startsWith("/dashboard/tools/reviews") ||
    pathname === `/feedback/${locationSlug}`;

  const orderedModules: DashboardModule[] = [
    "MISSED_CALL_TEXTBACK",
    "SCHEDULER",
    "FEEDBACK",
    "LOYALTY",
  ];

  const moduleTabs = orderedModules.filter((module) => enabledModules.includes(module)).map((module) => {
    if (module === "FEEDBACK") {
      return {
        module,
        href: "/dashboard/tools/reviews",
        active: isFeedbackRoute,
      };
    }

    if (module === "SCHEDULER") {
      return {
        module,
        href: "/dashboard/tools/scheduler",
        active: pathname === "/dashboard/tools/scheduler",
      };
    }

    if (module === "MISSED_CALL_TEXTBACK") {
      return {
        module,
        href: "/dashboard/tools/textback",
        active: pathname === "/dashboard/tools/textback" || pathname.startsWith("/dashboard/tools/textback/"),
      };
    }

    return {
      module,
      href: "/dashboard/tools/loyalty",
      active: pathname === "/dashboard/tools/loyalty",
    };
  });

  const homeTab = { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard" };

  return (
    <div className="border-b border-app-surface-muted bg-app-surface-muted">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-2.5 text-sm text-app-muted">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Owner Workspace</p>
        <nav className="flex items-center gap-3">
          <Link
            href={homeTab.href}
            aria-current={homeTab.active ? "page" : undefined}
            className={
              homeTab.active
                ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
                : "text-app-muted hover:text-app-text"
            }
          >
            {homeTab.label}
          </Link>

          {moduleTabs.map((tab) => (
            <Link
              key={tab.module}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={
                tab.active
                  ? `inline-flex items-center rounded-full border px-2.5 py-1 ${getModuleActiveClass(tab.module)}`
                  : "inline-flex items-center text-app-muted hover:text-app-text"
              }
            >
              <span className={`mr-1.5 inline-block size-2 rounded-full ${getModuleDotClass(tab.module)}`} aria-hidden />
              {MODULE_LABELS[tab.module]}
            </Link>
          ))}

          <Link
            href="/dashboard/settings/contacts"
            aria-current={pathname === "/dashboard/settings/contacts" ? "page" : undefined}
            className={
              pathname === "/dashboard/settings/contacts"
                ? "rounded-full border border-app-surface-muted bg-app-surface px-2.5 py-1 text-app-text"
                : "text-app-muted hover:text-app-text"
            }
          >
            Contacts
          </Link>
        </nav>
      </div>
    </div>
  );
}
