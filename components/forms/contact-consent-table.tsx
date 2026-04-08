"use client";

import { useState } from "react";

type ContactConsentStatus = "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
type ContactChannelPreference = "NONE" | "SMS" | "EMAIL" | "CALL";

type ContactRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  consentStatus: ContactConsentStatus;
  channelPreference: ContactChannelPreference;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  updatedAtIso: string;
};

type ContactConsentTableProps = {
  businessId: string;
  contacts: ContactRow[];
};

function formatSource(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

export function ContactConsentTable({ businessId, contacts }: ContactConsentTableProps) {
  const [rows, setRows] = useState(contacts);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (id: string, patch: Partial<ContactRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const saveRow = async (id: string) => {
    const row = rows.find((entry) => entry.id === id);
    if (!row || savingId) {
      return;
    }

    setSavingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/businesses/${businessId}/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentStatus: row.consentStatus,
          channelPreference: row.channelPreference,
          quietHoursStart: row.quietHoursStart,
          quietHoursEnd: row.quietHoursEnd,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save contact preferences.");
        return;
      }

      updateRow(id, { updatedAtIso: new Date().toISOString() });
    } catch {
      setError("Could not save contact preferences.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">{row.fullName || row.email || row.phone || "Unnamed contact"}</p>
            <p className="text-xs text-slate-500">Source: {formatSource(row.source)} | Updated {new Date(row.updatedAtIso).toLocaleString()}</p>
          </div>
          <p className="mt-1 text-xs text-slate-600">Email: {row.email || "(none)"} | Phone: {row.phone || "(none)"}</p>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <select
              value={row.consentStatus}
              onChange={(event) => updateRow(row.id, { consentStatus: event.target.value as ContactConsentStatus })}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700"
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="OPTED_IN">Opted in</option>
              <option value="OPTED_OUT">Opted out</option>
            </select>

            <select
              value={row.channelPreference}
              onChange={(event) => updateRow(row.id, { channelPreference: event.target.value as ContactChannelPreference })}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700"
            >
              <option value="NONE">No preference</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="CALL">Call</option>
            </select>

            <input
              value={row.quietHoursStart ?? ""}
              onChange={(event) => updateRow(row.id, { quietHoursStart: event.target.value || null })}
              placeholder="Quiet start (HH:MM)"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700"
            />

            <input
              value={row.quietHoursEnd ?? ""}
              onChange={(event) => updateRow(row.id, { quietHoursEnd: event.target.value || null })}
              placeholder="Quiet end (HH:MM)"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => saveRow(row.id)}
              disabled={savingId === row.id}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingId === row.id ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>
      ))}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
