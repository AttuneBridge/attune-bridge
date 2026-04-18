"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppModule, ModuleSubscriptionStatus } from "@prisma/client";

type ModuleKey = Exclude<AppModule, "FEEDBACK">;
type ModuleStatus = ModuleSubscriptionStatus;

type ModuleSubscriptionItem = {
  module: ModuleKey;
  status: ModuleStatus;
  startedAt: Date | null;
  endsAt: Date | null;
};

type ModuleSubscriptionFormProps = {
  businessId: string;
  moduleSubscriptions: ModuleSubscriptionItem[];
  manageToken?: string;
};

type ModuleSubscriptionResponse = {
  ok?: boolean;
  error?: string;
};

const MODULE_LABELS: Record<ModuleKey, string> = {
  REVIEWS: "Reviews",
  SCHEDULER: "Last-Minute Scheduler",
  LOYALTY: "Loyalty Builder",
  MISSED_CALL_TEXTBACK: "Missed Call Text Back",
};

const MODULE_HELP_TEXT: Record<ModuleKey, string> = {
  REVIEWS: "Control access to your core private feedback and review workflow.",
  SCHEDULER: "Launch last-minute discounted appointment slots to fill your calendar fast.",
  LOYALTY: "Run simple repeat-visit offers and loyalty campaigns.",
  MISSED_CALL_TEXTBACK: "Automatically text callers when your team misses a call.",
};

function getStatusClass(status: ModuleStatus) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "TRIAL") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  return "border-slate-300 bg-slate-100 text-slate-700";
}

function getStatusLabel(status: ModuleStatus) {
  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "TRIAL") {
    return "Trial";
  }

  return "Inactive";
}

export function ModuleSubscriptionForm({ businessId, moduleSubscriptions, manageToken }: ModuleSubscriptionFormProps) {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isLoadingModule, setIsLoadingModule] = useState<ModuleKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (module: ModuleKey, action: "activate" | "deactivate") => {
    const normalizedEmail = ownerEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter the owner email used at signup.");
      setSuccessMessage(null);
      return;
    }

    setIsLoadingModule(module);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/module-subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail: normalizedEmail,
          module,
          action,
          ...(manageToken ? { manageToken } : {}),
        }),
      });

      const result = (await response.json()) as ModuleSubscriptionResponse;

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Could not update module subscription.");
        return;
      }

      setSuccessMessage(
        action === "activate"
          ? `${MODULE_LABELS[module]} module activated.`
          : `${MODULE_LABELS[module]} module deactivation scheduled for next billing cycle.`,
      );
      router.refresh();
    } catch {
      setError("Could not update module subscription.");
    } finally {
      setIsLoadingModule(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="moduleOwnerEmail" className="mb-1.5 block text-sm font-medium text-slate-800">
          Owner email confirmation
        </label>
        <input
          id="moduleOwnerEmail"
          type="email"
          value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          placeholder="owner@business.com"
        />
      </div>

      <div className="space-y-2">
        {moduleSubscriptions.map((subscription) => {
          const isEnabled = subscription.status === "ACTIVE" || subscription.status === "TRIAL";
          const isLoading = isLoadingModule === subscription.module;

          return (
            <div key={subscription.module} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{MODULE_LABELS[subscription.module]}</p>
                  <p className="text-xs text-slate-600">{MODULE_HELP_TEXT[subscription.module]}</p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(subscription.status)}`}
                >
                  {getStatusLabel(subscription.status)}
                </span>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleSubmit(subscription.module, isEnabled ? "deactivate" : "activate")}
                  disabled={isLoading}
                  className={`inline-flex rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-70 ${
                    isEnabled
                      ? "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {isLoading ? "Saving..." : isEnabled ? "Deactivate module" : "Activate module"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {successMessage ? <p className="text-xs text-emerald-700">{successMessage}</p> : null}
    </div>
  );
}
