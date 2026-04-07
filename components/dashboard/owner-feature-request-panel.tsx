"use client";

import { useMemo, useState } from "react";
import { OwnerFeatureRequestForm } from "@/components/forms/owner-feature-request-form";

type FeatureRequestModule = "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK" | "PLATFORM";

type OwnerFeatureRequestPanelProps = {
  businessId: string;
  businessEmail: string;
  requests: Array<{
    id: string;
    ownerEmail: string;
    details: string;
    module: FeatureRequestModule;
    createdAt: string;
  }>;
};

const moduleLabels: Record<FeatureRequestModule, string> = {
  REVIEWS: "Reviews",
  SCHEDULER: "Last-Minute Scheduler",
  LOYALTY: "Loyalty Builder",
  MISSED_CALL_TEXTBACK: "Missed Call Text Back",
  PLATFORM: "Platform / Dashboard",
};

const moduleFilterOptions: Array<{ value: FeatureRequestModule | "ALL"; label: string }> = [
  { value: "ALL", label: "All modules" },
  { value: "REVIEWS", label: "Reviews" },
  { value: "SCHEDULER", label: "Last-Minute Scheduler" },
  { value: "LOYALTY", label: "Loyalty Builder" },
  { value: "MISSED_CALL_TEXTBACK", label: "Missed Call Text Back" },
  { value: "PLATFORM", label: "Platform / Dashboard" },
];

export function OwnerFeatureRequestPanel({ businessId, businessEmail, requests }: OwnerFeatureRequestPanelProps) {
  const [moduleFilter, setModuleFilter] = useState<FeatureRequestModule | "ALL">("ALL");

  const filteredRequests = useMemo(() => {
    if (moduleFilter === "ALL") {
      return requests;
    }

    return requests.filter((request) => request.module === moduleFilter);
  }, [moduleFilter, requests]);

  return (
    <section className="mt-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Feature requests</h2>
          <p className="text-sm text-slate-700">
            Share module-specific ideas and track recently submitted requests in one place.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-stretch">
          <div className="h-full rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-900">Request a feature</h3>
            <p className="mb-2 text-sm text-slate-700">
              Tell us what would make AttuneBridge more useful in your daily workflow.
            </p>
            <OwnerFeatureRequestForm businessId={businessId} />
          </div>

          <div className="flex h-full flex-col space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recent requests</p>
              <select
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value as FeatureRequestModule | "ALL")}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              >
                {moduleFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {filteredRequests.length === 0 ? (
              <p className="text-xs text-slate-600">No requests match this module filter yet.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-700">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-800">{new Date(request.createdAt).toLocaleString()}</p>
                      <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {moduleLabels[request.module]}
                      </span>
                    </div>
                    <p className="mt-1">{request.details}</p>
                    <p className="mt-1 text-slate-500">
                      Submitted by {request.ownerEmail === businessEmail ? "owner" : request.ownerEmail}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
