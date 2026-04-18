"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RenewSubscriptionFormProps = {
  businessId: string;
  isMonthlySubscriptionActive: boolean;
  manageToken?: string;
};

type RenewResponse = {
  ok?: boolean;
  error?: string;
  action?: string;
  checkoutUrl?: string | null;
  alreadyActive?: boolean;
  resumed?: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
};

const cancelReasonHints: Record<string, string> = {
  LOW_USAGE: "We can help you activate faster with a lighter weekly routine and fewer setup steps.",
  TOO_EXPENSIVE: "We can prioritize high-ROI modules first and sequence the rest over time.",
  MISSING_FEATURES: "Share what is missing and we can map current workarounds while we ship roadmap updates.",
  SWITCHING_TOOL: "Before you switch, compare recovered-case outcomes and response-time visibility side by side.",
  OTHER: "Tell us what would make this worth keeping and we will route it to product + success.",
};

export function RenewSubscriptionForm({
  businessId,
  isMonthlySubscriptionActive,
  manageToken,
}: RenewSubscriptionFormProps) {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("LOW_USAGE");

  const handleRenew = async (actionOverride?: "start" | "cancel" | "winback") => {
    if (!ownerEmail.trim()) {
      setError("Enter the owner email used at signup.");
      return;
    }

    const action = actionOverride ?? (isMonthlySubscriptionActive ? "cancel" : "start");

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail: ownerEmail.trim(),
          action,
          ...(action === "cancel" || action === "winback" ? { cancelReason } : {}),
          ...(manageToken ? { manageToken } : {}),
        }),
      });

      const result = (await response.json()) as RenewResponse;

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Renewal failed. Please try again.");
        return;
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      setSuccessMessage(
        result.action === "cancel"
          ? "Subscription will cancel at period end."
          : result.action === "winback"
            ? "Auto-renew restored. Subscription stays active."
            : result.alreadyActive
              ? "Subscription is already active."
              : result.resumed
                ? "Subscription renewal resumed."
                : "Checkout session created. Redirecting...",
      );
      router.refresh();
    } catch {
      setError("Renewal failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor="ownerEmailConfirm" className="mb-1.5 block text-sm font-medium text-slate-800">
          Owner email confirmation
        </label>
        <input
          id="ownerEmailConfirm"
          type="email"
          value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          placeholder="owner@business.com"
        />
      </div>
      <button
        type="button"
        onClick={() => handleRenew()}
        disabled={isLoading}
        className={`inline-flex rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 ${
          isMonthlySubscriptionActive
            ? "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
            : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        {isLoading
          ? isMonthlySubscriptionActive
            ? "Canceling..."
            : "Starting..."
          : isMonthlySubscriptionActive
            ? "Cancel monthly subscription"
            : "Start monthly subscription"}
      </button>
      {isMonthlySubscriptionActive ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-900">Before you cancel, help us improve:</p>
          <select
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="w-full rounded-lg border border-amber-300 bg-white p-2 text-sm text-slate-800"
          >
            <option value="LOW_USAGE">Not using enough</option>
            <option value="TOO_EXPENSIVE">Too expensive</option>
            <option value="MISSING_FEATURES">Missing features I need</option>
            <option value="SWITCHING_TOOL">Switching to another tool</option>
            <option value="OTHER">Other reason</option>
          </select>
          <p className="text-xs text-amber-900">{cancelReasonHints[cancelReason] ?? cancelReasonHints.OTHER}</p>
          <button
            type="button"
            onClick={() => handleRenew("winback")}
            disabled={isLoading}
            className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Keep active + claim win-back extension
          </button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {successMessage ? <p className="text-xs text-emerald-700">{successMessage}</p> : null}
    </div>
  );
}
