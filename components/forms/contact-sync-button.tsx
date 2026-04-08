"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ContactSyncButtonProps = {
  businessId: string;
};

export function ContactSyncButton({ businessId }: ContactSyncButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/businesses/${businessId}/contacts/sync`, {
        method: "POST",
      });

      const result = (await response.json()) as {
        error?: string;
        synced?: number;
        totalContacts?: number;
      };

      if (!response.ok) {
        setError(result.error ?? "Could not sync contacts.");
        return;
      }

      setMessage(`Synced ${result.synced ?? 0} records. Total contacts: ${result.totalContacts ?? 0}.`);
      router.refresh();
    } catch {
      setError("Could not sync contacts.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSyncing ? "Syncing contacts..." : "Sync contacts from modules"}
      </button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
