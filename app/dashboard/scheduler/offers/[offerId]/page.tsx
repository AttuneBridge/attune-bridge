import Link from "next/link";
import { notFound } from "next/navigation";
import { SchedulerRecipientSmsStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { getOwnerWorkspaceContextOrRedirect } from "@/lib/owner-workspace-context";
import { prisma } from "@/lib/prisma";

type SchedulerOfferDetailsPageProps = {
  params: Promise<{ offerId: string }>;
};

const SMS_STATUS_STYLES: Record<SchedulerRecipientSmsStatus, string> = {
  PENDING: "border-slate-300 bg-slate-100 text-slate-700",
  SENT: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  SKIPPED: "border-amber-200 bg-amber-50 text-amber-800",
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function SchedulerOfferDetailsPage({ params }: SchedulerOfferDetailsPageProps) {
  const workspace = await getOwnerWorkspaceContextOrRedirect();
  const { offerId } = await params;

  const offer = await prisma.schedulerOffer.findFirst({
    where: {
      id: offerId,
      businessId: workspace.businessId,
    },
    include: {
      claimedByContact: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      recipients: {
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!offer) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Scheduler Offer Details</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{offer.serviceLabel}</h1>
          <p className="text-sm text-slate-700">{offer.discountText}</p>
          <p className="text-sm text-slate-700">Status: {offer.status}</p>
          <p className="text-sm text-slate-700">Starts: {formatDateTime(offer.startsAt)}</p>
          <p className="text-sm text-slate-700">Expires: {formatDateTime(offer.expiresAt)}</p>
          <p className="text-sm text-slate-700">Sent at: {formatDateTime(offer.sentAt)}</p>
          <p className="text-sm text-slate-700">Claimed at: {formatDateTime(offer.claimedAt)}</p>
          <p className="text-sm text-slate-700">
            Claimed by: {offer.claimedByContact ? `${offer.claimedByContact.name} (${offer.claimedByContact.phone})` : "-"}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Recipients</h2>
          {offer.recipients.length === 0 ? (
            <p className="text-sm text-slate-600">No recipients were attached to this offer.</p>
          ) : (
            offer.recipients.map((recipient) => (
              <div key={recipient.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">
                    {recipient.contact.name} ({recipient.contact.phone})
                  </p>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${SMS_STATUS_STYLES[recipient.smsStatus]}`}
                  >
                    {recipient.smsStatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">Queue status: {recipient.contact.isActive ? "Active" : "Paused"}</p>
                <p className="text-xs text-slate-600">Sent at: {formatDateTime(recipient.sentAt)}</p>
                <p className="text-xs text-slate-600">Claimed at: {formatDateTime(recipient.claimedAt)}</p>
                <p className="text-xs text-slate-600">Provider message id: {recipient.providerMessageId ?? "-"}</p>
                <p className="text-xs text-slate-600">Error: {recipient.smsErrorMessage ?? "-"}</p>
              </div>
            ))
          )}
        </div>

        <Link href="/dashboard/scheduler" className="text-sm font-medium text-slate-900 underline">
          Back to scheduler workspace
        </Link>
      </Card>
    </main>
  );
}
