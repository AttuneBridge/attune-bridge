"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SchedulerContactItem = {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  notes: string | null;
  optedInAt: string | Date | null;
  optedOutAt: string | Date | null;
  optedOutReason: string | null;
  lastMessagedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type SchedulerOfferItem = {
  id: string;
  serviceLabel: string;
  discountText: string;
  startsAt: string | Date;
  expiresAt: string | Date | null;
  status: "DRAFT" | "SENT" | "CLAIMED" | "CLOSED" | "EXPIRED";
  sentAt: string | Date | null;
  claimedAt: string | Date | null;
  closedAt: string | Date | null;
  createdAt: string | Date;
  claimedByContact: {
    id: string;
    name: string;
    phone: string;
  } | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
};

type SchedulerWorkspaceProps = {
  businessId: string;
  initialContacts: SchedulerContactItem[];
  initialOffers: SchedulerOfferItem[];
};

const DUPLICATE_SEND_COOLDOWN_MS = 2 * 60 * 1000;

function formatDateTime(value: string | Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isContactEligibleForSms(contact: SchedulerContactItem) {
  return contact.isActive && !contact.optedOutAt;
}

export function SchedulerWorkspace({ businessId, initialContacts, initialOffers }: SchedulerWorkspaceProps) {
  const [contacts, setContacts] = useState<SchedulerContactItem[]>(initialContacts);
  const [offers, setOffers] = useState<SchedulerOfferItem[]>(initialOffers);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    initialContacts.filter(isContactEligibleForSms).map((contact) => contact.id),
  );
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [serviceLabel, setServiceLabel] = useState("");
  const [discountText, setDiscountText] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSendingOffer, setIsSendingOffer] = useState(false);
  const [isSendReviewOpen, setIsSendReviewOpen] = useState(false);
  const [isRefreshingOffers, setIsRefreshingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverRecentOfferId, setServerRecentOfferId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const eligibleContacts = useMemo(
    () => contacts.filter(isContactEligibleForSms),
    [contacts],
  );

  const activeContactCount = useMemo(
    () => eligibleContacts.length,
    [eligibleContacts],
  );

  const selectedRecipientCount = useMemo(
    () => eligibleContacts.filter((contact) => selectedContactIds.includes(contact.id)).length,
    [eligibleContacts, selectedContactIds],
  );

  const smsPreview = useMemo(() => {
    const startsAtText = startsAt
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(startsAt))
      : "<start-time>";

    return `Your Business: last-minute opening ${startsAtText} for ${serviceLabel || "<service>"}. ${discountText || "<discount>"}. First come first booked: <claim-link> Reply STOP to opt out.`;
  }, [discountText, serviceLabel, startsAt]);

  const duplicateSendCooldown = useMemo(() => {
    const normalizedServiceLabel = serviceLabel.trim();
    const normalizedDiscountText = discountText.trim();
    const startsAtMs = startsAt ? new Date(startsAt).getTime() : null;

    if (!normalizedServiceLabel || !normalizedDiscountText || !startsAtMs || Number.isNaN(startsAtMs)) {
      return null;
    }

    const matchingOffer = offers.find((offer) => {
      if (!offer.sentAt) {
        return false;
      }

      const offerSentAtMs = new Date(offer.sentAt).getTime();
      const offerStartsAtMs = new Date(offer.startsAt).getTime();

      if (Number.isNaN(offerSentAtMs) || Number.isNaN(offerStartsAtMs)) {
        return false;
      }

      return (
        offer.serviceLabel.trim() === normalizedServiceLabel &&
        offer.discountText.trim() === normalizedDiscountText &&
        offerStartsAtMs === startsAtMs &&
        nowMs - offerSentAtMs < DUPLICATE_SEND_COOLDOWN_MS
      );
    });

    if (!matchingOffer?.sentAt) {
      return null;
    }

    const sentAtMs = new Date(matchingOffer.sentAt).getTime();
    const remainingMs = DUPLICATE_SEND_COOLDOWN_MS - (nowMs - sentAtMs);

    if (Number.isNaN(sentAtMs) || remainingMs <= 0) {
      return null;
    }

    return {
      offerId: matchingOffer.id,
      remainingMs,
    };
  }, [discountText, nowMs, offers, serviceLabel, startsAt]);

  const cooldownOfferId = duplicateSendCooldown?.offerId ?? serverRecentOfferId;

  async function refreshOffers() {
    setIsRefreshingOffers(true);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/scheduler/offers`);
      const result = (await response.json()) as { error?: string; items?: SchedulerOfferItem[] };

      if (!response.ok || !result.items) {
        setError(result.error ?? "Could not load offers.");
        return;
      }

      setOffers(result.items);
    } catch {
      setError("Could not load offers.");
    } finally {
      setIsRefreshingOffers(false);
    }
  }

  async function handleAddContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSavingContact(true);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/scheduler/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: contactName,
          phone: contactPhone,
          notes: contactNotes,
        }),
      });

      const result = (await response.json()) as { error?: string; contact?: SchedulerContactItem };

      if (!response.ok || !result.contact) {
        setError(result.error ?? "Could not add contact.");
        return;
      }

      setContacts((previous) => [result.contact as SchedulerContactItem, ...previous]);
      setSelectedContactIds((previous) => {
        if (!isContactEligibleForSms(result.contact!)) {
          return previous;
        }

        return previous.includes(result.contact!.id) ? previous : [result.contact!.id, ...previous];
      });
      setContactName("");
      setContactPhone("");
      setContactNotes("");
      setSuccessMessage("Contact added to queue.");
    } catch {
      setError("Could not add contact.");
    } finally {
      setIsSavingContact(false);
    }
  }

  async function handleToggleContact(contactId: string, nextIsActive: boolean) {
    setError(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/scheduler/contacts/${encodeURIComponent(contactId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: nextIsActive,
          }),
        },
      );

      const result = (await response.json()) as { error?: string; contact?: SchedulerContactItem };

      if (!response.ok || !result.contact) {
        setError(result.error ?? "Could not update contact.");
        return;
      }

      setContacts((previous) =>
        previous.map((contact) => (contact.id === contactId ? (result.contact as SchedulerContactItem) : contact)),
      );

      setSelectedContactIds((previous) => {
        if (nextIsActive) {
          return previous.includes(contactId) ? previous : [...previous, contactId];
        }

        return previous.filter((id) => id !== contactId);
      });
    } catch {
      setError("Could not update contact.");
    }
  }

  async function handleDeleteContact(contactId: string) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/scheduler/contacts/${encodeURIComponent(contactId)}`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not remove contact.");
        return;
      }

      setContacts((previous) => previous.filter((contact) => contact.id !== contactId));
      setSelectedContactIds((previous) => previous.filter((id) => id !== contactId));
      setSuccessMessage("Contact removed.");
    } catch {
      setError("Could not remove contact.");
    }
  }

  async function handleSendOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (duplicateSendCooldown) {
      setError(
        `A matching offer was just sent. Try again in ${Math.max(
          Math.ceil(duplicateSendCooldown.remainingMs / 1000),
          1,
        )}s.`,
      );
      return;
    }

    if (!isSendReviewOpen) {
      setIsSendReviewOpen(true);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSendingOffer(true);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/scheduler/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceLabel,
          discountText,
          startsAt: startsAt ? new Date(startsAt).toISOString() : "",
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          recipientContactIds: selectedContactIds,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        cooldownSeconds?: number;
        delivery?: { recipientCount: number; sentCount: number; failedCount: number };
      };

      if (!response.ok) {
        if (response.status === 409 && typeof result.cooldownSeconds === "number") {
          setServerRecentOfferId(typeof (result as { recentOfferId?: unknown }).recentOfferId === "string" ? (result as { recentOfferId: string }).recentOfferId : null);
          setError(
            `A matching offer was just sent. Try again in ${Math.max(result.cooldownSeconds, 0)}s.`,
          );
        } else {
          setServerRecentOfferId(null);
          setError(result.error ?? "Could not send offer.");
        }

        return;
      }

      await refreshOffers();
      setServiceLabel("");
      setDiscountText("");
      setStartsAt("");
      setExpiresAt("");
      setIsSendReviewOpen(false);
      setServerRecentOfferId(null);
      setSuccessMessage(
        `Offer sent to ${result.delivery?.recipientCount ?? 0} contacts (${result.delivery?.sentCount ?? 0} sent).`,
      );
    } catch {
      setError("Could not send offer.");
    } finally {
      setIsSendingOffer(false);
    }
  }

  async function handleCloseOffer(offerId: string) {
    setError(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/scheduler/offers/${encodeURIComponent(offerId)}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not close offer.");
        return;
      }

      await refreshOffers();
      setSuccessMessage("Offer closed.");
    } catch {
      setError("Could not close offer.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Create Last-Minute Offer</h2>
          <p className="text-xs text-slate-600">First click claim wins</p>
        </div>

        <form onSubmit={handleSendOffer} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="serviceLabel" className="mb-1 block text-sm font-medium text-slate-800">
                Service
              </label>
              <input
                id="serviceLabel"
                type="text"
                value={serviceLabel}
                onChange={(event) => setServiceLabel(event.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                placeholder="60-minute deep tissue"
                maxLength={120}
                required
              />
            </div>
            <div>
              <label htmlFor="discountText" className="mb-1 block text-sm font-medium text-slate-800">
                Discount copy
              </label>
              <input
                id="discountText"
                type="text"
                value={discountText}
                onChange={(event) => setDiscountText(event.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                placeholder="30% off if booked now"
                maxLength={160}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="startsAt" className="mb-1 block text-sm font-medium text-slate-800">
                Appointment start
              </label>
              <input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                required
              />
            </div>
            <div>
              <label htmlFor="expiresAt" className="mb-1 block text-sm font-medium text-slate-800">
                Claim expires (optional)
              </label>
              <input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recipients</p>
            <p className="mt-1 text-xs text-slate-600">
              {selectedRecipientCount} selected of {activeContactCount} active opted-in contacts
            </p>
            <div className="mt-2 max-h-36 space-y-1 overflow-auto text-sm">
              {eligibleContacts.map((contact) => {
                const checked = selectedContactIds.includes(contact.id);

                return (
                  <label key={contact.id} className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextChecked = event.target.checked;
                        setSelectedContactIds((previous) => {
                          if (nextChecked) {
                            return previous.includes(contact.id) ? previous : [...previous, contact.id];
                          }

                          return previous.filter((id) => id !== contact.id);
                        });
                      }}
                    />
                    <span>
                      {contact.name} ({contact.phone})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Compliance: only text customers who opted in. STOP unsubscribes a contact. START or UNSTOP re-subscribes them.
          </p>

          <button
            type="submit"
            disabled={isSendingOffer || selectedRecipientCount === 0 || Boolean(duplicateSendCooldown)}
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSendingOffer
              ? "Sending..."
              : duplicateSendCooldown
                ? `Cooldown ${Math.max(Math.ceil(duplicateSendCooldown.remainingMs / 1000), 1)}s`
                : isSendReviewOpen
                  ? "Confirm and send now"
                  : "Review and send"}
          </button>

          {duplicateSendCooldown && cooldownOfferId ? (
            <Link
              href={`/dashboard/scheduler/offers/${cooldownOfferId}`}
              className="ml-3 inline-flex text-xs font-medium text-slate-900 underline"
            >
              View recent matching offer
            </Link>
          ) : null}

          {isSendReviewOpen ? (
            <div className="space-y-2 rounded-lg border border-slate-300 bg-slate-100 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Send review</p>
              <p className="text-sm text-slate-700">
                This sends now to {selectedRecipientCount} contact{selectedRecipientCount === 1 ? "" : "s"}. First valid claim link click reserves the slot.
              </p>
              {duplicateSendCooldown ? (
                <div className="space-y-1">
                  <p className="text-sm text-amber-700">
                    Matching offer cooldown active: wait {Math.max(Math.ceil(duplicateSendCooldown.remainingMs / 1000), 1)}s before resending the same slot.
                  </p>
                  {cooldownOfferId ? (
                    <Link
                      href={`/dashboard/scheduler/offers/${cooldownOfferId}`}
                      className="inline-flex text-xs font-medium text-slate-900 underline"
                    >
                      View recent matching offer
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm text-slate-700">
                Offer: {serviceLabel} | {discountText}
              </p>
              <p className="text-sm text-slate-700">
                Starts: {startsAt ? formatDateTime(startsAt) : "-"} | Expires: {expiresAt ? formatDateTime(expiresAt) : "-"}
              </p>
              <div className="rounded-lg border border-slate-300 bg-white p-2.5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SMS preview</p>
                <p className="text-xs text-slate-700">{smsPreview}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSendReviewOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel review
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active and Recent Offers</h2>
          <button
            type="button"
            onClick={() => void refreshOffers()}
            disabled={isRefreshingOffers}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {isRefreshingOffers ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="space-y-2">
          {offers.length === 0 ? (
            <p className="text-sm text-slate-600">No offers yet.</p>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {offer.serviceLabel} - {offer.discountText}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-600">{offer.status}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Starts: {formatDateTime(offer.startsAt)} | Expires: {formatDateTime(offer.expiresAt)}
                </p>
                <p className="text-xs text-slate-600">
                  Recipients: {offer.recipientCount} | Sent: {offer.sentCount} | Failed: {offer.failedCount}
                </p>
                <p className="text-xs text-slate-600">
                  Claimed by: {offer.claimedByContact ? `${offer.claimedByContact.name} (${offer.claimedByContact.phone})` : "-"}
                </p>
                <p className="text-xs text-slate-600">Claimed at: {formatDateTime(offer.claimedAt)}</p>

                <Link
                  href={`/dashboard/scheduler/offers/${offer.id}`}
                  className="mt-2 inline-flex text-xs font-medium text-slate-900 underline"
                >
                  View offer details
                </Link>

                {offer.status === "SENT" ? (
                  <button
                    type="button"
                    onClick={() => void handleCloseOffer(offer.id)}
                    className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Close offer
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Queue Contacts</h2>

        <form onSubmit={handleAddContact} className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            type="text"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
            placeholder="Name"
            required
          />
          <input
            type="tel"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
            placeholder="Mobile"
            required
          />
          <input
            type="text"
            value={contactNotes}
            onChange={(event) => setContactNotes(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
            placeholder="Note (optional)"
          />
          <button
            type="submit"
            disabled={isSavingContact}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {isSavingContact ? "Adding..." : "Add"}
          </button>
        </form>

        <div className="space-y-2">
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-600">No contacts in queue yet.</p>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {contact.name} - {contact.phone}
                  </p>
                  <p className="text-xs text-slate-600">Last messaged: {formatDateTime(contact.lastMessagedAt)}</p>
                  <p className="text-xs text-slate-600">
                    Status:{" "}
                    {contact.optedOutAt
                      ? `Opted out (${contact.optedOutReason ?? "SMS opt-out"} on ${formatDateTime(contact.optedOutAt)})`
                      : contact.isActive
                        ? "Active"
                        : "Paused"}
                  </p>
                  {contact.notes ? <p className="text-xs text-slate-600">{contact.notes}</p> : null}
                </div>

                <div className="flex items-center gap-2">
                  {contact.optedOutAt ? (
                    <span className="inline-flex rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                      Awaiting START/UNSTOP
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleToggleContact(contact.id, !contact.isActive)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {contact.isActive ? "Pause" : "Activate"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteContact(contact.id)}
                    className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
    </div>
  );
}
