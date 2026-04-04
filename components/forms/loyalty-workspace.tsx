"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  LoyaltyAudience,
  LoyaltyOfferKind,
  LoyaltyPlaybookStatus,
  LoyaltyPlaybookType,
  LoyaltyTemplateCategory,
  LoyaltyTrigger,
} from "@prisma/client";
import { useRouter } from "next/navigation";

type LoyaltyWorkspacePlaybook = {
  id: string;
  name: string;
  status: LoyaltyPlaybookStatus;
  type: LoyaltyPlaybookType;
  audience: LoyaltyAudience;
  trigger: LoyaltyTrigger;
  delayHours: number;
  offer: { id: string; name: string } | null;
  template: { id: string; name: string } | null;
  messageCount: number;
};

type LoyaltyWorkspaceOffer = {
  id: string;
  name: string;
  kind: LoyaltyOfferKind;
  valueText: string;
  isActive: boolean;
};

type LoyaltyWorkspaceTemplate = {
  id: string;
  name: string;
  category: LoyaltyTemplateCategory;
  isDefault: boolean;
};

type LoyaltyRecoveryItem = {
  id: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED";
  sentiment: "NEUTRAL" | "NEGATIVE";
  customerName: string | null;
  customerEmail: string | null;
  message: string | null;
  createdAt: string;
};

type LoyaltyWorkspaceProps = {
  businessId: string;
  initialPlaybooks: LoyaltyWorkspacePlaybook[];
  initialOffers: LoyaltyWorkspaceOffer[];
  initialTemplates: LoyaltyWorkspaceTemplate[];
  initialRecoveryItems: LoyaltyRecoveryItem[];
};

type LoyaltyWorkspaceViewMode = "ACTIONS" | "VIEWS";

const OFFER_KIND_VALUES: LoyaltyOfferKind[] = [
  LoyaltyOfferKind.FLAT_DISCOUNT,
  LoyaltyOfferKind.FREE_ADD_ON,
  LoyaltyOfferKind.PRIORITY_ACCESS,
  LoyaltyOfferKind.CUSTOM,
];

const TEMPLATE_CATEGORY_VALUES: LoyaltyTemplateCategory[] = [
  LoyaltyTemplateCategory.GREAT,
  LoyaltyTemplateCategory.OKAY,
  LoyaltyTemplateCategory.NOT_GOOD,
  LoyaltyTemplateCategory.LAPSED,
];

const PLAYBOOK_TYPE_VALUES: LoyaltyPlaybookType[] = [
  LoyaltyPlaybookType.SECOND_VISIT_BOOSTER,
  LoyaltyPlaybookType.WE_MISS_YOU,
  LoyaltyPlaybookType.VIP_THANK_YOU,
  LoyaltyPlaybookType.SERVICE_RECOVERY,
  LoyaltyPlaybookType.CUSTOM,
];

const AUDIENCE_VALUES: LoyaltyAudience[] = [
  LoyaltyAudience.FIRST_TIME,
  LoyaltyAudience.REPEAT,
  LoyaltyAudience.LAPSED_30_DAYS,
  LoyaltyAudience.HIGH_FREQUENCY,
];

const TRIGGER_VALUES: LoyaltyTrigger[] = [
  LoyaltyTrigger.FEEDBACK_POSITIVE,
  LoyaltyTrigger.FEEDBACK_NEUTRAL,
  LoyaltyTrigger.FEEDBACK_NEGATIVE,
  LoyaltyTrigger.LIFECYCLE_LAPSED_30_DAYS,
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LoyaltyWorkspace({
  businessId,
  initialPlaybooks,
  initialOffers,
  initialTemplates,
  initialRecoveryItems,
}: LoyaltyWorkspaceProps) {
  const router = useRouter();

  const [playbooks, setPlaybooks] = useState(initialPlaybooks);
  const [offers, setOffers] = useState(initialOffers);
  const [templates, setTemplates] = useState(initialTemplates);
  const [recoveryItems, setRecoveryItems] = useState(initialRecoveryItems);

  const [offerName, setOfferName] = useState("");
  const [offerKind, setOfferKind] = useState<LoyaltyOfferKind>(LoyaltyOfferKind.FLAT_DISCOUNT);
  const [offerValueText, setOfferValueText] = useState("");
  const [offerValidDays, setOfferValidDays] = useState("14");

  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState<LoyaltyTemplateCategory>(LoyaltyTemplateCategory.GREAT);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateCtaLabel, setTemplateCtaLabel] = useState("Book Now");

  const [playbookName, setPlaybookName] = useState("");
  const [playbookType, setPlaybookType] = useState<LoyaltyPlaybookType>(LoyaltyPlaybookType.SECOND_VISIT_BOOSTER);
  const [playbookAudience, setPlaybookAudience] = useState<LoyaltyAudience>(LoyaltyAudience.FIRST_TIME);
  const [playbookTrigger, setPlaybookTrigger] = useState<LoyaltyTrigger>(LoyaltyTrigger.FEEDBACK_POSITIVE);
  const [playbookDelayHours, setPlaybookDelayHours] = useState("48");
  const [playbookOfferId, setPlaybookOfferId] = useState("");
  const [playbookTemplateId, setPlaybookTemplateId] = useState("");

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<LoyaltyWorkspaceViewMode>("ACTIONS");

  const templateOptionsForTrigger = useMemo(() => {
    if (playbookTrigger === LoyaltyTrigger.FEEDBACK_POSITIVE) {
      return templates.filter((template) => template.category === LoyaltyTemplateCategory.GREAT);
    }

    if (playbookTrigger === LoyaltyTrigger.FEEDBACK_NEUTRAL) {
      return templates.filter((template) => template.category === LoyaltyTemplateCategory.OKAY);
    }

    if (playbookTrigger === LoyaltyTrigger.FEEDBACK_NEGATIVE) {
      return templates.filter((template) => template.category === LoyaltyTemplateCategory.NOT_GOOD);
    }

    return templates.filter((template) => template.category === LoyaltyTemplateCategory.LAPSED);
  }, [templates, playbookTrigger]);

  async function handleProcessQueue() {
    setError(null);
    setSuccessMessage(null);
    setIsBusy(true);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/loyalty/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const result = (await response.json()) as {
        error?: string;
        attempted?: number;
        sentCount?: number;
        failedCount?: number;
        skippedCount?: number;
      };

      if (!response.ok) {
        setError(result.error ?? "Could not process queued loyalty messages.");
        return;
      }

      setSuccessMessage(
        `Processed ${result.attempted ?? 0} message(s): ${result.sentCount ?? 0} sent, ${result.failedCount ?? 0} failed, ${result.skippedCount ?? 0} skipped.`,
      );
      router.refresh();
    } catch {
      setError("Could not process queued loyalty messages.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsBusy(true);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/loyalty/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: offerName,
          kind: offerKind,
          valueText: offerValueText,
          validDays: Number(offerValidDays),
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not create offer.");
        return;
      }

      setOfferName("");
      setOfferValueText("");
      setOfferValidDays("14");
      setPlaybookOfferId("");
      setSuccessMessage("Offer created.");
      router.refresh();
    } catch {
      setError("Could not create offer.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsBusy(true);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/loyalty/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          category: templateCategory,
          subject: templateSubject,
          body: templateBody,
          ctaLabel: templateCtaLabel,
          isDefault: true,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not create template.");
        return;
      }

      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateCtaLabel("Book Now");
      setPlaybookTemplateId("");
      setSuccessMessage("Template created and set as default for this category.");
      router.refresh();
    } catch {
      setError("Could not create template.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreatePlaybook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsBusy(true);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/loyalty/playbooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playbookName,
          type: playbookType,
          audience: playbookAudience,
          trigger: playbookTrigger,
          delayHours: Number(playbookDelayHours),
          offerId: playbookOfferId || null,
          templateId: playbookTemplateId || null,
          suppressIfBooked: true,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Could not create playbook.");
        return;
      }

      setPlaybookName("");
      setPlaybookDelayHours("48");
      setPlaybookOfferId("");
      setPlaybookTemplateId("");
      setSuccessMessage("Playbook created.");
      router.refresh();
    } catch {
      setError("Could not create playbook.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTogglePlaybookStatus(playbook: LoyaltyWorkspacePlaybook) {
    setError(null);
    setSuccessMessage(null);

    const nextStatus =
      playbook.status === LoyaltyPlaybookStatus.ACTIVE
        ? LoyaltyPlaybookStatus.PAUSED
        : LoyaltyPlaybookStatus.ACTIVE;

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/loyalty/playbooks/${encodeURIComponent(playbook.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      const result = (await response.json()) as {
        error?: string;
        playbook?: { id: string; status: LoyaltyPlaybookStatus };
      };

      if (!response.ok || !result.playbook) {
        setError(result.error ?? "Could not update playbook status.");
        return;
      }

      setPlaybooks((previous) =>
        previous.map((entry) =>
          entry.id === playbook.id ? { ...entry, status: result.playbook!.status } : entry,
        ),
      );
      setSuccessMessage(
        result.playbook.status === LoyaltyPlaybookStatus.ACTIVE
          ? "Playbook activated."
          : "Playbook paused.",
      );
      router.refresh();
    } catch {
      setError("Could not update playbook status.");
    }
  }

  async function handleResolveRecovery(feedbackId: string) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/loyalty/recovery/${encodeURIComponent(feedbackId)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delayHours: 24 }),
        },
      );

      const result = (await response.json()) as { error?: string; message?: { status: string } };

      if (!response.ok) {
        setError(result.error ?? "Could not resolve recovery item.");
        return;
      }

      setRecoveryItems((previous) => previous.filter((item) => item.id !== feedbackId));
      setSuccessMessage(
        result.message?.status === "PENDING"
          ? "Recovery resolved and follow-up queued."
          : "Recovery resolved. Follow-up skipped (missing email).",
      );
      router.refresh();
    } catch {
      setError("Could not resolve recovery item.");
    }
  }

  async function handleToggleOfferActive(offer: LoyaltyWorkspaceOffer) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/loyalty/offers/${encodeURIComponent(offer.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !offer.isActive }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        offer?: { id: string; isActive: boolean };
      };

      if (!response.ok || !result.offer) {
        setError(result.error ?? "Could not update offer.");
        return;
      }

      setOffers((previous) =>
        previous.map((entry) =>
          entry.id === offer.id ? { ...entry, isActive: result.offer!.isActive } : entry,
        ),
      );
      setSuccessMessage(result.offer.isActive ? "Offer activated." : "Offer paused.");
      router.refresh();
    } catch {
      setError("Could not update offer.");
    }
  }

  async function handleSetTemplateDefault(template: LoyaltyWorkspaceTemplate) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/loyalty/templates/${encodeURIComponent(template.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: true }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        template?: { id: string; category: LoyaltyTemplateCategory; isDefault: boolean };
      };

      if (!response.ok || !result.template) {
        setError(result.error ?? "Could not update template.");
        return;
      }

      setTemplates((previous) =>
        previous.map((entry) =>
          entry.category === result.template!.category
            ? { ...entry, isDefault: entry.id === result.template!.id }
            : entry,
        ),
      );
      setSuccessMessage("Template set as default.");
      router.refresh();
    } catch {
      setError("Could not update template.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Start here (2-minute setup)</h2>
        <p className="mt-1 text-sm text-slate-700">Set up one offer, one template, and one playbook. Then activate and process due messages.</p>
        <ol className="mt-2 space-y-1 text-sm text-slate-700">
          <li>1. Create an offer your customer can use on the next visit.</li>
          <li>2. Create a template with your follow-up message and CTA button text.</li>
          <li>3. Create a playbook to connect the trigger, delay, offer, and template.</li>
          <li>4. Activate the playbook and use queue processing to send due follow-ups.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-600">
          Tip: for a fast win, use trigger <span className="font-medium text-slate-700">FEEDBACK_POSITIVE</span> with a 48-hour delay.
        </p>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">What these terms mean</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Offer</span>: the customer incentive (what they get), like
            &quot;10% off your next visit&quot; or &quot;free add-on with your next booking.&quot;
          </p>
          <p>
            <span className="font-semibold text-slate-900">Template</span>: the message your customer receives (what you say), including
            subject line, body, and CTA button text.
          </p>
          <p>
            <span className="font-semibold text-slate-900">Playbook</span>: the automation rule (when it sends), combining trigger,
            audience, delay, and optional offer/template.
          </p>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Simple mental model: <span className="font-medium text-slate-700">Offer = What they get</span>, <span className="font-medium text-slate-700">Template = What you say</span>, <span className="font-medium text-slate-700">Playbook = When it sends</span>.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode("ACTIONS")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              viewMode === "ACTIONS"
                ? "border border-slate-900 bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Loyalty Actions
          </button>
          <button
            type="button"
            onClick={() => setViewMode("VIEWS")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              viewMode === "VIEWS"
                ? "border border-slate-900 bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Loyalty Views
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {viewMode === "ACTIONS"
            ? "Actions view: build and send campaigns (offers, templates, playbooks, queue processing)."
            : "Views mode: review and manage existing playbooks, offers, templates, and recovery items."}
        </p>
      </section>

      {viewMode === "ACTIONS" ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Queue Processing</h2>
              <button
                type="button"
                onClick={() => void handleProcessQueue()}
                disabled={isBusy}
                className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-70"
              >
                {isBusy ? "Working..." : "Process due messages"}
              </button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <form onSubmit={handleCreateOffer} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Create Offer</h3>
              <p className="text-xs text-slate-600">Offer = what the customer gets (the incentive).</p>
              <p className="text-xs text-slate-600">Business purpose: give customers a reason to return soon.</p>
              <label htmlFor="offer-name" className="block text-xs font-medium text-slate-700">
                Offer name
              </label>
              <input
                id="offer-name"
                value={offerName}
                onChange={(event) => setOfferName(event.target.value)}
                placeholder="$10 off next visit"
                maxLength={80}
                required
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <label htmlFor="offer-kind" className="block text-xs font-medium text-slate-700">
                Offer type
              </label>
              <select
                id="offer-kind"
                value={offerKind}
                onChange={(event) => setOfferKind(event.target.value as LoyaltyOfferKind)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {OFFER_KIND_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <label htmlFor="offer-value" className="block text-xs font-medium text-slate-700">
                Offer details shown to customer
              </label>
              <input
                id="offer-value"
                value={offerValueText}
                onChange={(event) => setOfferValueText(event.target.value)}
                placeholder="$10 off your next appointment"
                maxLength={160}
                required
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <label htmlFor="offer-valid-days" className="block text-xs font-medium text-slate-700">
                Valid for (days)
              </label>
              <input
                id="offer-valid-days"
                value={offerValidDays}
                onChange={(event) => setOfferValidDays(event.target.value)}
                type="number"
                min={1}
                max={365}
                required
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              >
                Save offer
              </button>
            </form>

            <form onSubmit={handleCreateTemplate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Create Template</h3>
              <p className="text-xs text-slate-600">Template = what the customer reads (the message).</p>
              <p className="text-xs text-slate-600">Business purpose: send the right message in your brand voice. Use placeholders like {"{first_name}"} and {"{business_name}"}.</p>
              <label htmlFor="template-name" className="block text-xs font-medium text-slate-700">
                Template name
              </label>
              <input
                id="template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Great follow-up"
                maxLength={80}
                required
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <label htmlFor="template-category" className="block text-xs font-medium text-slate-700">
                Customer scenario
              </label>
              <select
                id="template-category"
                value={templateCategory}
                onChange={(event) => setTemplateCategory(event.target.value as LoyaltyTemplateCategory)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {TEMPLATE_CATEGORY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <label htmlFor="template-subject" className="block text-xs font-medium text-slate-700">
                Subject line
              </label>
              <input
                id="template-subject"
                value={templateSubject}
                onChange={(event) => setTemplateSubject(event.target.value)}
                placeholder="Thanks for visiting {business_name}"
                maxLength={160}
                required
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <label htmlFor="template-body" className="block text-xs font-medium text-slate-700">
                Message body
              </label>
              <textarea
                id="template-body"
                value={templateBody}
                onChange={(event) => setTemplateBody(event.target.value)}
                placeholder="Hi {first_name}, thanks for visiting..."
                maxLength={5000}
                required
                className="min-h-20 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <label htmlFor="template-cta" className="block text-xs font-medium text-slate-700">
                CTA button label
              </label>
              <input
                id="template-cta"
                value={templateCtaLabel}
                onChange={(event) => setTemplateCtaLabel(event.target.value)}
                placeholder="Book Now"
                maxLength={60}
                required
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              >
                Save template
              </button>
            </form>
          </section>

          <form onSubmit={handleCreatePlaybook} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Create Playbook</h3>
            <p className="text-xs text-slate-600">Playbook = when and who to send to (the automation rule).</p>
            <p className="text-xs text-slate-600">Business purpose: automate follow-up timing so outreach happens consistently without manual effort.</p>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Example campaign: Happy first-time guests</p>
              <p className="mt-1">Use this to drive second visits and public reviews from customers who had a great experience.</p>
              <p className="mt-1">
                Recommended setup: Trigger <span className="font-medium text-slate-900">FEEDBACK_POSITIVE</span>, Audience <span className="font-medium text-slate-900">FIRST_TIME</span>, Delay <span className="font-medium text-slate-900">48 hours</span>, plus your best comeback offer and a GREAT template.
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="playbook-name" className="block text-xs font-medium text-slate-700">
                  Playbook name
                </label>
                <input
                  id="playbook-name"
                  value={playbookName}
                  onChange={(event) => setPlaybookName(event.target.value)}
                  placeholder="2nd Visit Booster"
                  maxLength={80}
                  required
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="playbook-type" className="block text-xs font-medium text-slate-700">
                  Playbook type
                </label>
                <select
                  id="playbook-type"
                  value={playbookType}
                  onChange={(event) => setPlaybookType(event.target.value as LoyaltyPlaybookType)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  {PLAYBOOK_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="playbook-audience" className="block text-xs font-medium text-slate-700">
                  Audience
                </label>
                <select
                  id="playbook-audience"
                  value={playbookAudience}
                  onChange={(event) => setPlaybookAudience(event.target.value as LoyaltyAudience)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  {AUDIENCE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <div className="space-y-1">
                <label htmlFor="playbook-trigger" className="block text-xs font-medium text-slate-700">
                  Trigger
                </label>
                <select
                  id="playbook-trigger"
                  value={playbookTrigger}
                  onChange={(event) => {
                    setPlaybookTrigger(event.target.value as LoyaltyTrigger);
                    setPlaybookTemplateId("");
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  {TRIGGER_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="playbook-delay" className="block text-xs font-medium text-slate-700">
                  Delay (hours)
                </label>
                <input
                  id="playbook-delay"
                  type="number"
                  min={0}
                  max={720}
                  value={playbookDelayHours}
                  onChange={(event) => setPlaybookDelayHours(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="playbook-offer" className="block text-xs font-medium text-slate-700">
                  Offer (optional)
                </label>
                <select
                  id="playbook-offer"
                  value={playbookOfferId}
                  onChange={(event) => setPlaybookOfferId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  <option value="">No offer</option>
                  {offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="playbook-template" className="block text-xs font-medium text-slate-700">
                  Template (optional)
                </label>
                <select
                  id="playbook-template"
                  value={playbookTemplateId}
                  onChange={(event) => setPlaybookTemplateId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  <option value="">Auto/default template</option>
                  {templateOptionsForTrigger.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-70"
            >
              Save playbook
            </button>
          </form>
        </>
      ) : null}

      {viewMode === "VIEWS" ? (
        <>
          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Playbooks</h3>
            <p className="text-xs text-slate-600">Each playbook runs an automation rule: trigger + audience + delay + optional offer/template.</p>
            <p className="text-xs text-slate-600">Keep at least one playbook active to continue sending loyalty follow-ups.</p>
            {playbooks.length === 0 ? (
              <p className="text-sm text-slate-600">No playbooks yet.</p>
            ) : (
              playbooks.map((playbook) => (
                <div key={playbook.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {playbook.name} ({playbook.type})
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleTogglePlaybookStatus(playbook)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {playbook.status === LoyaltyPlaybookStatus.ACTIVE ? "Pause" : "Activate"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Trigger: {playbook.trigger} | Audience: {playbook.audience} | Delay: {playbook.delayHours}h
                  </p>
                  <p className="text-xs text-slate-600">
                    Offer: {playbook.offer?.name ?? "(none)"} | Template: {playbook.template?.name ?? "(auto)"} | Messages: {playbook.messageCount}
                  </p>
                </div>
              ))
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Offers</h3>
              <p className="text-xs text-slate-600">Offers are customer incentives used inside your follow-up messages.</p>
              {offers.length === 0 ? (
                <p className="text-sm text-slate-600">No offers yet.</p>
              ) : (
                offers.map((offer) => (
                  <div key={offer.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                    <p className="font-medium text-slate-900">{offer.name}</p>
                    <p className="text-slate-600">{offer.kind} - {offer.valueText}</p>
                    <button
                      type="button"
                      onClick={() => void handleToggleOfferActive(offer)}
                      className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {offer.isActive ? "Pause" : "Activate"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Templates</h3>
              <p className="text-xs text-slate-600">Templates are reusable message drafts grouped by customer scenario.</p>
              {templates.length === 0 ? (
                <p className="text-sm text-slate-600">No templates yet.</p>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                    <p className="font-medium text-slate-900">{template.name}</p>
                    <p className="text-slate-600">
                      {template.category} {template.isDefault ? "(default)" : ""}
                    </p>
                    {!template.isDefault ? (
                      <button
                        type="button"
                        onClick={() => void handleSetTemplateDefault(template)}
                        className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Set default
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Recovery Queue</h3>
            {recoveryItems.length === 0 ? (
              <p className="text-sm text-slate-600">No open neutral or negative feedback items.</p>
            ) : (
              recoveryItems.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {entry.customerName ?? "(No customer name)"} - {entry.sentiment}
                  </p>
                  <p className="text-xs text-slate-600">{entry.customerEmail ?? "(No customer email)"}</p>
                  <p className="text-xs text-slate-600">Submitted: {formatDateTime(entry.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-700">{entry.message ?? "(No message provided)"}</p>
                  <button
                    type="button"
                    onClick={() => void handleResolveRecovery(entry.id)}
                    className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Mark resolved and queue follow-up
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
    </div>
  );
}
