"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type MissedCallEventItem = {
  id: string;
  callerPhone: string;
  smsStatus: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  errorMessage: string | null;
  createdAtIso: string;
  replyForwardedAtIso: string | null;
};

type TextBackWorkspaceProps = {
  businessId: string;
  initialTwilioPhone: string;
  initialAutoReplyMessage: string;
  initialIsActive: boolean;
  initialReplyForwardPhone: string;
  webhookBaseUrl: string;
  initialEvents: MissedCallEventItem[];
};

type SaveResponse = {
  ok?: boolean;
  error?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusBadgeClass(status: MissedCallEventItem["smsStatus"]) {
  if (status === "SENT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "FAILED") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (status === "SKIPPED") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-300 bg-slate-100 text-slate-700";
}

export function TextBackWorkspace({
  businessId,
  initialTwilioPhone,
  initialAutoReplyMessage,
  initialIsActive,
  initialReplyForwardPhone,
  webhookBaseUrl,
  initialEvents,
}: TextBackWorkspaceProps) {
  const router = useRouter();
  const [twilioPhone, setTwilioPhone] = useState(initialTwilioPhone);
  const [autoReplyMessage, setAutoReplyMessage] = useState(initialAutoReplyMessage);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [replyForwardPhone, setReplyForwardPhone] = useState(initialReplyForwardPhone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const webhookUrls = useMemo(
    () => ({
      voice: `${webhookBaseUrl}/api/missed-call/voice`,
      inboundSms: `${webhookBaseUrl}/api/missed-call/sms/inbound`,
      dialResult: `${webhookBaseUrl}/api/missed-call/dial-result`,
    }),
    [webhookBaseUrl],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/textback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          twilioPhone,
          autoReplyMessage,
          isActive,
          replyForwardPhone,
        }),
      });

      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Could not save settings.");
        return;
      }

      setSuccessMessage("Settings saved.");
      router.refresh();
    } catch {
      setError("Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="twilioPhone" className="mb-1.5 block text-sm font-medium text-slate-800">
            Twilio number assigned to this business
          </label>
          <input
            id="twilioPhone"
            type="tel"
            value={twilioPhone}
            onChange={(event) => setTwilioPhone(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            placeholder="+15555550123"
          />
        </div>

        <div>
          <label htmlFor="replyForwardPhone" className="mb-1.5 block text-sm font-medium text-slate-800">
            Owner phone for reply forwarding (optional)
          </label>
          <input
            id="replyForwardPhone"
            type="tel"
            value={replyForwardPhone}
            onChange={(event) => setReplyForwardPhone(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            placeholder="+15555550199"
          />
        </div>

        <div>
          <label htmlFor="autoReply" className="mb-1.5 block text-sm font-medium text-slate-800">
            Auto-reply message
          </label>
          <textarea
            id="autoReply"
            value={autoReplyMessage}
            onChange={(event) => setAutoReplyMessage(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            placeholder="Hey - sorry we missed your call. How can we help?"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Send auto-text when a call is missed
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save settings"}
        </button>

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {successMessage ? <p className="text-xs text-emerald-700">{successMessage}</p> : null}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Twilio webhook setup</p>
        <p>
          <span className="font-medium text-slate-900">Voice URL:</span> {webhookUrls.voice}
        </p>
        <p>
          <span className="font-medium text-slate-900">Dial action callback:</span> {webhookUrls.dialResult}
        </p>
        <p>
          <span className="font-medium text-slate-900">Inbound SMS URL:</span> {webhookUrls.inboundSms}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-900">Recent missed calls</p>
        {initialEvents.length === 0 ? (
          <p className="text-sm text-slate-600">No missed call events yet.</p>
        ) : (
          <div className="space-y-2">
            {initialEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-medium text-slate-900">Caller:</span> {event.callerPhone}
                  </p>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(event.smsStatus)}`}
                  >
                    {event.smsStatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{formatDateTime(event.createdAtIso)}</p>
                {event.replyForwardedAtIso ? (
                  <p className="mt-1 text-xs text-slate-600">Reply forwarded {formatDateTime(event.replyForwardedAtIso)}</p>
                ) : null}
                {event.errorMessage ? <p className="mt-1 text-xs text-rose-600">{event.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
