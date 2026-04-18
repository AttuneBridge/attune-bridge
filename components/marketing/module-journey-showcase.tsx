"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ModuleTone = "reviews" | "textback" | "scheduler" | "loyalty";

export type ModuleJourneyItem = {
  module: string;
  tone: ModuleTone;
  customerVoice: string;
  gap: string;
  bridgeAction: string;
  realWorldOutcome: string;
  showNowLabel: string;
  showNowHref: string;
};

type ModuleJourneyShowcaseProps = {
  items: ModuleJourneyItem[];
  intro?: string;
};

function getToneClasses(tone: ModuleTone) {
  switch (tone) {
    case "reviews":
      return {
        tab: "border-module-reviews-border bg-module-reviews-soft text-module-reviews-solid",
        panel: "border-module-reviews-border bg-module-reviews-soft/60",
        iconWrap: "bg-module-reviews-solid/12 text-module-reviews-solid",
      };
    case "textback":
      return {
        tab: "border-module-textback-border bg-module-textback-soft text-module-textback-solid",
        panel: "border-module-textback-border bg-module-textback-soft/60",
        iconWrap: "bg-module-textback-solid/12 text-module-textback-solid",
      };
    case "scheduler":
      return {
        tab: "border-module-scheduler-border bg-module-scheduler-soft text-module-scheduler-solid",
        panel: "border-module-scheduler-border bg-module-scheduler-soft/60",
        iconWrap: "bg-module-scheduler-solid/12 text-module-scheduler-solid",
      };
    case "loyalty":
      return {
        tab: "border-module-loyalty-border bg-module-loyalty-soft text-module-loyalty-solid",
        panel: "border-module-loyalty-border bg-module-loyalty-soft/60",
        iconWrap: "bg-module-loyalty-solid/12 text-module-loyalty-solid",
      };
    default:
      return {
        tab: "border-app-surface-muted bg-app-surface text-app-text",
        panel: "border-app-surface-muted bg-app-surface-muted",
        iconWrap: "bg-app-surface-muted text-app-text",
      };
  }
}

function getToneMotifClasses(tone: ModuleTone) {
  switch (tone) {
    case "reviews":
      return {
        orbPrimary: "from-module-reviews-solid/24 to-module-reviews-solid/0",
        orbSecondary: "from-module-reviews-border/36 to-module-reviews-border/0",
        lineStroke: "stroke-module-reviews-border/45",
      };
    case "textback":
      return {
        orbPrimary: "from-module-textback-solid/22 to-module-textback-solid/0",
        orbSecondary: "from-module-textback-border/34 to-module-textback-border/0",
        lineStroke: "stroke-module-textback-border/45",
      };
    case "scheduler":
      return {
        orbPrimary: "from-module-scheduler-solid/22 to-module-scheduler-solid/0",
        orbSecondary: "from-module-scheduler-border/34 to-module-scheduler-border/0",
        lineStroke: "stroke-module-scheduler-border/45",
      };
    case "loyalty":
      return {
        orbPrimary: "from-module-loyalty-solid/22 to-module-loyalty-solid/0",
        orbSecondary: "from-module-loyalty-border/34 to-module-loyalty-border/0",
        lineStroke: "stroke-module-loyalty-border/45",
      };
    default:
      return {
        orbPrimary: "from-app-muted/20 to-app-muted/0",
        orbSecondary: "from-app-surface-muted/30 to-app-surface-muted/0",
        lineStroke: "stroke-app-surface-muted",
      };
  }
}

function ModuleMotif({ tone }: { tone: ModuleTone }) {
  const motif = getToneMotifClasses(tone);

  if (tone === "reviews") {
    return (
      <>
        <div className={`absolute -left-16 top-8 h-44 w-44 rounded-full bg-radial ${motif.orbPrimary}`} />
        <div className={`absolute right-8 top-2 h-28 w-28 rounded-full bg-radial ${motif.orbSecondary}`} />
        <svg className="absolute -left-8 top-18 h-40 w-40 opacity-40 md:opacity-55 lg:opacity-72" viewBox="0 0 160 160" fill="none">
          <circle className={motif.lineStroke} cx="80" cy="80" r="10" strokeWidth="1" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="20" strokeWidth="1" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="30" strokeWidth="1" strokeDasharray="2 4" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="40" strokeWidth="1" strokeDasharray="3 5" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="50" strokeWidth="1" strokeDasharray="2 6" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="60" strokeWidth="1" strokeDasharray="2 7" />
        </svg>
        <svg className="absolute left-28 bottom-4 h-10 w-32 opacity-30 md:opacity-42 lg:opacity-60" viewBox="0 0 128 40" fill="none">
          <path className={motif.lineStroke} d="M0 20c4-10 8-10 12 0s8 10 12 0 8-10 12 0 8 10 12 0 8-10 12 0 8 10 12 0 8-10 12 0 8 10 12 0" strokeWidth="1.1" />
        </svg>
        <svg className="absolute right-12 bottom-8 h-20 w-28 opacity-35 md:opacity-50 lg:opacity-68" viewBox="0 0 112 80" fill="none">
          <path className={motif.lineStroke} d="M8 64c20-16 32-24 48-24s28 8 48 24" strokeWidth="1.2" />
          <path className={motif.lineStroke} d="M8 48c16-12 28-18 48-18s32 6 48 18" strokeWidth="1" />
        </svg>
      </>
    );
  }

  if (tone === "textback") {
    return (
      <>
        <div className={`absolute -right-14 top-6 h-40 w-40 rounded-full bg-radial ${motif.orbPrimary}`} />
        <div className={`absolute left-8 bottom-4 h-36 w-36 rounded-full bg-radial ${motif.orbSecondary}`} />
        <svg className="absolute right-0 top-10 h-44 w-44 opacity-40 md:opacity-56 lg:opacity-72" viewBox="0 0 176 176" fill="none">
          <circle className={motif.lineStroke} cx="88" cy="88" r="12" strokeWidth="1" />
          <circle className={motif.lineStroke} cx="88" cy="88" r="24" strokeWidth="1" />
          <circle className={motif.lineStroke} cx="88" cy="88" r="36" strokeWidth="1" />
          <circle className={motif.lineStroke} cx="88" cy="88" r="48" strokeWidth="1" strokeDasharray="2 4" />
          <circle className={motif.lineStroke} cx="88" cy="88" r="60" strokeWidth="1" strokeDasharray="2 5" />
          <circle className={motif.lineStroke} cx="88" cy="88" r="72" strokeWidth="1" strokeDasharray="3 7" />
        </svg>
        <svg className="absolute left-10 top-6 h-10 w-36 opacity-30 md:opacity-42 lg:opacity-60" viewBox="0 0 144 40" fill="none">
          <path className={motif.lineStroke} d="M0 20c4-8 8-8 12 0s8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0" strokeWidth="1.1" />
        </svg>
        <svg className="absolute right-10 top-6 h-28 w-28 opacity-35 md:opacity-50 lg:opacity-68" viewBox="0 0 96 96" fill="none">
          <path className={motif.lineStroke} d="M16 24h64M16 48h64M16 72h46" strokeWidth="1.2" />
          <circle className={motif.lineStroke} cx="70" cy="72" r="8" strokeWidth="1.2" />
        </svg>
      </>
    );
  }

  if (tone === "scheduler") {
    return (
      <>
        <div className={`absolute left-1/3 top-0 h-40 w-40 rounded-full bg-radial ${motif.orbPrimary}`} />
        <div className={`absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-radial ${motif.orbSecondary}`} />
        <svg className="absolute -right-2 bottom-2 h-40 w-40 opacity-38 md:opacity-54 lg:opacity-70" viewBox="0 0 160 160" fill="none">
          <circle className={motif.lineStroke} cx="80" cy="80" r="10" strokeWidth="1" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="20" strokeWidth="1" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="30" strokeWidth="1" strokeDasharray="2 4" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="40" strokeWidth="1" strokeDasharray="3 5" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="50" strokeWidth="1" strokeDasharray="2 6" />
          <circle className={motif.lineStroke} cx="80" cy="80" r="60" strokeWidth="1" strokeDasharray="2 7" />
        </svg>
        <svg className="absolute left-28 bottom-2 h-10 w-32 opacity-30 md:opacity-42 lg:opacity-58" viewBox="0 0 128 40" fill="none">
          <path className={motif.lineStroke} d="M0 20c4-9 8-9 12 0s8 9 12 0 8-9 12 0 8 9 12 0 8-9 12 0 8 9 12 0 8-9 12 0 8 9 12 0" strokeWidth="1.1" />
        </svg>
        <svg className="absolute left-10 top-5 h-24 w-24 opacity-35 md:opacity-48 lg:opacity-62" viewBox="0 0 96 96" fill="none">
          <rect className={motif.lineStroke} x="16" y="16" width="64" height="64" rx="12" strokeWidth="1.2" />
          <path className={motif.lineStroke} d="M16 38h64M34 16v22M62 16v22" strokeWidth="1.2" />
        </svg>
      </>
    );
  }

  return (
    <>
      <div className={`absolute -left-12 bottom-2 h-36 w-36 rounded-full bg-radial ${motif.orbPrimary}`} />
      <div className={`absolute right-12 top-4 h-44 w-44 rounded-full bg-radial ${motif.orbSecondary}`} />
      <svg className="absolute left-0 bottom-4 h-36 w-36 opacity-40 md:opacity-55 lg:opacity-72" viewBox="0 0 144 144" fill="none">
        <circle className={motif.lineStroke} cx="72" cy="72" r="10" strokeWidth="1" />
        <circle className={motif.lineStroke} cx="72" cy="72" r="20" strokeWidth="1" />
        <circle className={motif.lineStroke} cx="72" cy="72" r="30" strokeWidth="1" strokeDasharray="2 4" />
        <circle className={motif.lineStroke} cx="72" cy="72" r="40" strokeWidth="1" strokeDasharray="3 5" />
        <circle className={motif.lineStroke} cx="72" cy="72" r="50" strokeWidth="1" strokeDasharray="2 6" />
        <circle className={motif.lineStroke} cx="72" cy="72" r="60" strokeWidth="1" strokeDasharray="2 7" />
      </svg>
      <svg className="absolute right-8 top-4 h-10 w-36 opacity-30 md:opacity-42 lg:opacity-58" viewBox="0 0 144 40" fill="none">
        <path className={motif.lineStroke} d="M0 20c4-8 8-8 12 0s8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0 8 8 12 0 8-8 12 0" strokeWidth="1.1" />
      </svg>
      <svg className="absolute right-10 bottom-6 h-24 w-28 opacity-35 md:opacity-50 lg:opacity-66" viewBox="0 0 112 96" fill="none">
        <path className={motif.lineStroke} d="M24 22h64M24 48h64M24 74h64" strokeWidth="1.1" />
        <circle className={motif.lineStroke} cx="24" cy="22" r="6" strokeWidth="1.1" />
        <circle className={motif.lineStroke} cx="88" cy="48" r="6" strokeWidth="1.1" />
        <circle className={motif.lineStroke} cx="24" cy="74" r="6" strokeWidth="1.1" />
      </svg>
    </>
  );
}

function ModuleIcon({ tone }: { tone: ModuleTone }) {
  if (tone === "reviews") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
        <path d="M5 7h14v8H8l-3 3V7Z" />
        <path d="M9 10h6M9 13h4" />
      </svg>
    );
  }

  if (tone === "textback") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
        <path d="M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="m9 11 2 2 4-4" />
      </svg>
    );
  }

  if (tone === "scheduler") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
        <path d="M7 4v3M17 4v3M5 10h14" />
        <rect x="5" y="6" width="14" height="13" rx="2" />
        <path d="m10 14 2 2 3-3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
      <path d="M12 6v12M6 12h12" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function ModuleJourneyShowcase({ items, intro }: ModuleJourneyShowcaseProps) {
  const firstModule = items[0]?.module ?? "";
  const [selectedModule, setSelectedModule] = useState(firstModule);

  useEffect(() => {
    if (!items.some((item) => item.module === selectedModule)) {
      setSelectedModule(items[0]?.module ?? "");
    }
  }, [items, selectedModule]);

  const selectedItem = useMemo(
    () => items.find((item) => item.module === selectedModule) ?? items[0],
    [items, selectedModule],
  );

  if (!selectedItem) {
    return null;
  }

  const toneClasses = getToneClasses(selectedItem.tone);

  return (
    <div className="space-y-4">
      {intro ? <p className="max-w-3xl text-sm text-app-muted">{intro}</p> : null}

      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isSelected = item.module === selectedItem.module;
          const selectedClass = isSelected
            ? getToneClasses(item.tone).tab
            : "border-app-surface-muted bg-app-surface text-app-muted";

          return (
            <button
              key={item.module}
              type="button"
              onClick={() => setSelectedModule(item.module)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 ${selectedClass}`}
              aria-pressed={isSelected}
            >
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-app-surface text-[10px] font-semibold">
                {item.module.slice(0, 1)}
              </span>
              {item.module}
            </button>
          );
        })}
      </div>

      <section key={selectedItem.module} className={`module-panel-enter relative overflow-hidden rounded-2xl border p-5 md:p-6 ${toneClasses.panel}`}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <ModuleMotif tone={selectedItem.tone} />
        </div>

        <div className="relative grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <div className="space-y-4">
            <div className="module-item-enter flex items-start gap-3 [animation-delay:40ms]">
              <div className={`inline-flex size-10 items-center justify-center rounded-xl ${toneClasses.iconWrap}`}>
                <ModuleIcon tone={selectedItem.tone} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Focused module</p>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-app-text">{selectedItem.module}</h3>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="module-item-enter rounded-xl border border-app-surface-muted bg-app-surface/90 p-4 [animation-delay:100ms]">
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Customer voice</p>
                <p className="mt-2 text-sm italic text-app-text">{selectedItem.customerVoice}</p>
              </div>
              <div className="module-item-enter rounded-xl border border-app-surface-muted bg-app-surface/90 p-4 [animation-delay:160ms]">
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Operational gap</p>
                <p className="mt-2 text-sm text-app-text">{selectedItem.gap}</p>
              </div>
              <div className="module-item-enter rounded-xl border border-app-surface-muted bg-app-surface/90 p-4 [animation-delay:220ms]">
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">How AttuneBridge responds</p>
                <p className="mt-2 text-sm text-app-text">{selectedItem.bridgeAction}</p>
              </div>
            </div>
          </div>

          <aside className="module-item-enter rounded-xl border border-app-surface-muted bg-app-surface/95 p-4 md:p-5 [animation-delay:280ms]">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Partner-ready result</p>
            <p className="mt-2 text-sm text-app-text">{selectedItem.realWorldOutcome}</p>
            <Link
              href={selectedItem.showNowHref}
              className="mt-4 inline-flex rounded-lg bg-app-text px-4 py-2 text-sm font-medium text-app-bg hover:opacity-90"
            >
              {selectedItem.showNowLabel}
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
