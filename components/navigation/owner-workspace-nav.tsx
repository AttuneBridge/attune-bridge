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

export function OwnerWorkspaceNav({ locationSlug, enabledModules }: OwnerWorkspaceNavProps) {
  const pathname = usePathname();
  const isFeedbackRoute =
    pathname.startsWith("/dashboard/reviews") || pathname === `/feedback/${locationSlug}`;
  const moduleTabs = enabledModules.filter((module) => module !== "REVIEWS").map((module) => {
    if (module === "FEEDBACK") {
      return {
        module,
        href: "/dashboard/reviews",
        active: isFeedbackRoute,
      };
    }

    if (module === "SCHEDULER") {
      return {
        module,
        href: "/dashboard/scheduler",
        active: pathname === "/dashboard/scheduler",
      };
    }

    if (module === "MISSED_CALL_TEXTBACK") {
      return {
        module,
        href: "/dashboard/textback",
        active: pathname === "/dashboard/textback" || pathname.startsWith("/dashboard/textback/"),
      };
    }

    return {
      module,
      href: "/dashboard/loyalty",
      active: pathname === "/dashboard/loyalty",
    };
  });

  const homeTab = { href: "/dashboard", label: "Home", active: pathname === "/dashboard" };

  return (
    <div className="border-b border-slate-200 bg-slate-100/80">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-2.5 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Owner Workspace</p>
        <nav className="flex items-center gap-3">
          <Link
            href={homeTab.href}
            aria-current={homeTab.active ? "page" : undefined}
            className={
              homeTab.active
                ? "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-900"
                : "hover:text-slate-900"
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
                  ? "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-900"
                  : "hover:text-slate-900"
              }
            >
              {MODULE_LABELS[tab.module]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
