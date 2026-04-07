"use client";

import { useMemo, useState } from "react";
import { OwnerFeatureRequestForm } from "@/components/forms/owner-feature-request-form";

type FeatureRequestModule = "REVIEWS" | "SCHEDULER" | "LOYALTY" | "MISSED_CALL_TEXTBACK" | "PLATFORM";
type FeatureRequestStatus = "NEW" | "UNDER_REVIEW" | "ACCEPTED" | "SHIPPED" | "DECLINED";

type OwnerFeatureRequestPanelProps = {
  businessId: string;
  businessEmail: string;
  requests: Array<{
    id: string;
    ownerEmail: string;
    details: string;
    module: FeatureRequestModule;
    status: FeatureRequestStatus;
    upvoteCount: number;
    hasUpvoted: boolean;
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

const statusLabels: Record<FeatureRequestStatus, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  ACCEPTED: "Accepted",
  SHIPPED: "Shipped",
  DECLINED: "Declined",
};

const statusBadgeStyles: Record<FeatureRequestStatus, string> = {
  NEW: "border-slate-300 bg-slate-50 text-slate-700",
  UNDER_REVIEW: "border-indigo-200 bg-indigo-50 text-indigo-700",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SHIPPED: "border-sky-200 bg-sky-50 text-sky-700",
  DECLINED: "border-rose-200 bg-rose-50 text-rose-700",
};

export function OwnerFeatureRequestPanel({ businessId, businessEmail, requests }: OwnerFeatureRequestPanelProps) {
  const [moduleFilter, setModuleFilter] = useState<FeatureRequestModule | "ALL">("ALL");
  const [requestItems, setRequestItems] = useState(requests);
  const [isUpvotingId, setIsUpvotingId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    if (moduleFilter === "ALL") {
      return requestItems;
    }

    return requestItems.filter((request) => request.module === moduleFilter);
  }, [moduleFilter, requestItems]);

  const handleUpvote = async (requestId: string) => {
    setIsUpvotingId(requestId);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/feature-requests/${encodeURIComponent(requestId)}/upvote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const result = (await response.json()) as { ok?: boolean; upvoteCount?: number; hasUpvoted?: boolean };

      if (!response.ok || !result.ok) {
        return;
      }

      setRequestItems((previous) =>
        previous.map((request) =>
          request.id === requestId
            ? {
                ...request,
                upvoteCount: typeof result.upvoteCount === "number" ? result.upvoteCount : request.upvoteCount,
                hasUpvoted: typeof result.hasUpvoted === "boolean" ? result.hasUpvoted : true,
              }
            : request,
        ),
      );
    } finally {
      setIsUpvotingId(null);
    }
  };

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
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeStyles[request.status]}`}
                      >
                        {statusLabels[request.status]}
                      </span>
                    </div>
                    <p className="mt-1">{request.details}</p>
                    <p className="mt-1 text-slate-500">
                      Submitted by {request.ownerEmail === businessEmail ? "owner" : request.ownerEmail}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={request.hasUpvoted || isUpvotingId === request.id}
                        onClick={() => handleUpvote(request.id)}
                        className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {request.hasUpvoted ? "Upvoted" : isUpvotingId === request.id ? "Upvoting..." : "Upvote"}
                      </button>
                      <p className="text-[11px] text-slate-500">
                        {request.upvoteCount} upvote{request.upvoteCount === 1 ? "" : "s"}
                      </p>
                    </div>
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
