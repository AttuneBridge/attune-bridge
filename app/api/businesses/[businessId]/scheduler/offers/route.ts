import {
  AppModule,
  SchedulerOfferStatus,
  SchedulerRecipientSmsStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";
import { sendSmsNotification } from "@/lib/sms";
import {
  buildSchedulerClaimLink,
  createClaimToken,
  formatSchedulerOfferSms,
} from "@/lib/scheduler/utils";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type CreateOfferRequestBody = {
  serviceLabel?: unknown;
  discountText?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  recipientContactIds?: unknown;
  manageToken?: unknown;
};

async function hasSchedulerAccess(businessId: string, manageToken?: string) {
  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return { ok: false as const, status: access.status, error: access.error };
  }

  const subscription = await getModuleSubscriptionForBusiness(businessId, AppModule.SCHEDULER);

  if (!subscription.isEnabled) {
    return { ok: false as const, status: 403, error: "Scheduler module is not active." };
  }

  return { ok: true as const };
}

function toDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(request.url);
  const manageToken = searchParams.get("token")?.trim();

  const access = await hasSchedulerAccess(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const offers = await prisma.schedulerOffer.findMany({
    where: { businessId },
    orderBy: [{ createdAt: "desc" }],
    take: 30,
    include: {
      claimedByContact: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      recipients: {
        select: {
          id: true,
          contactId: true,
          smsStatus: true,
          claimedAt: true,
        },
      },
    },
  });

  const items = offers.map((offer) => ({
    id: offer.id,
    serviceLabel: offer.serviceLabel,
    discountText: offer.discountText,
    startsAt: offer.startsAt,
    expiresAt: offer.expiresAt,
    status: offer.status,
    sentAt: offer.sentAt,
    claimedAt: offer.claimedAt,
    closedAt: offer.closedAt,
    createdAt: offer.createdAt,
    claimedByContact: offer.claimedByContact,
    recipientCount: offer.recipients.length,
    sentCount: offer.recipients.filter((recipient) => recipient.smsStatus === SchedulerRecipientSmsStatus.SENT)
      .length,
    failedCount: offer.recipients.filter((recipient) => recipient.smsStatus === SchedulerRecipientSmsStatus.FAILED)
      .length,
  }));

  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: CreateOfferRequestBody;

  try {
    body = (await request.json()) as CreateOfferRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await hasSchedulerAccess(
    businessId,
    typeof body.manageToken === "string" ? body.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const serviceLabel = typeof body.serviceLabel === "string" ? body.serviceLabel.trim() : "";
  const discountText = typeof body.discountText === "string" ? body.discountText.trim() : "";
  const startsAt = toDate(body.startsAt);
  const expiresAt = body.expiresAt === null || body.expiresAt === undefined ? null : toDate(body.expiresAt);
  const recipientContactIds = Array.isArray(body.recipientContactIds)
    ? body.recipientContactIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (!serviceLabel || serviceLabel.length > 120) {
    return NextResponse.json(
      { error: "Service label is required and must be 120 characters or fewer." },
      { status: 400 },
    );
  }

  if (!discountText || discountText.length > 160) {
    return NextResponse.json(
      { error: "Discount text is required and must be 160 characters or fewer." },
      { status: 400 },
    );
  }

  if (!startsAt) {
    return NextResponse.json({ error: "A valid start time is required." }, { status: 400 });
  }

  if (expiresAt && expiresAt <= startsAt) {
    return NextResponse.json({ error: "Expiration must be after the start time." }, { status: 400 });
  }

  const recentDuplicate = await prisma.schedulerOffer.findFirst({
    where: {
      businessId,
      serviceLabel,
      discountText,
      startsAt,
      sentAt: {
        gte: new Date(Date.now() - 2 * 60 * 1000),
      },
    },
    select: {
      id: true,
      sentAt: true,
    },
    orderBy: {
      sentAt: "desc",
    },
  });

  if (recentDuplicate) {
    const remainingMs =
      2 * 60 * 1000 - (Date.now() - (recentDuplicate.sentAt ? recentDuplicate.sentAt.getTime() : Date.now()));

    return NextResponse.json(
      {
        error:
          "A matching offer was just sent. Wait 2 minutes before sending this same slot again.",
        cooldownSeconds: Math.max(Math.ceil(remainingMs / 1000), 0),
        recentOfferId: recentDuplicate.id,
      },
      { status: 409 },
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const contactWhere =
    recipientContactIds.length > 0
      ? {
          businessId,
          isActive: true,
          optedOutAt: null,
          id: { in: recipientContactIds },
        }
      : {
          businessId,
          isActive: true,
          optedOutAt: null,
        };

  const contacts = await prisma.schedulerContact.findMany({
    where: contactWhere,
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "Add at least one active, opted-in queue contact first." },
      { status: 400 },
    );
  }

  const now = new Date();
  const offer = await prisma.schedulerOffer.create({
    data: {
      businessId,
      serviceLabel,
      discountText,
      startsAt,
      expiresAt,
      status: SchedulerOfferStatus.SENT,
      sentAt: now,
      recipients: {
        create: contacts.map((contact) => ({
          contactId: contact.id,
          claimToken: createClaimToken(),
        })),
      },
    },
    select: {
      id: true,
      serviceLabel: true,
      discountText: true,
      startsAt: true,
      expiresAt: true,
      status: true,
      createdAt: true,
      recipients: {
        select: {
          id: true,
          contactId: true,
          claimToken: true,
          contact: {
            select: {
              id: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of offer.recipients) {
    const claimLink = buildSchedulerClaimLink(recipient.claimToken);
    const smsBody = formatSchedulerOfferSms({
      businessName: business.name,
      startsAt: offer.startsAt,
      serviceLabel: offer.serviceLabel,
      discountText: offer.discountText,
      claimLink,
    });

    const smsResult = await sendSmsNotification({
      toPhone: recipient.contact.phone,
      body: smsBody,
    });

    const smsStatus = smsResult.skipped
      ? SchedulerRecipientSmsStatus.SKIPPED
      : smsResult.sent
        ? SchedulerRecipientSmsStatus.SENT
        : SchedulerRecipientSmsStatus.FAILED;

    if (smsStatus === SchedulerRecipientSmsStatus.SENT) {
      sentCount += 1;

      await prisma.schedulerContact.update({
        where: { id: recipient.contact.id },
        data: {
          lastMessagedAt: new Date(),
        },
      });
    }

    if (smsStatus === SchedulerRecipientSmsStatus.FAILED) {
      failedCount += 1;
    }

    await prisma.schedulerOfferRecipient.update({
      where: { id: recipient.id },
      data: {
        smsStatus,
        sentAt: smsResult.sent ? new Date() : null,
        providerMessageId: smsResult.providerMessageId,
        smsErrorMessage: smsResult.errorMessage,
      },
    });
  }

  await trackValidationEvent({
    event: validationEvent.schedulerOfferSent,
    businessId,
    metadata: {
      offerId: offer.id,
      recipientCount: offer.recipients.length,
      sentCount,
      failedCount,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      offer: {
        id: offer.id,
        serviceLabel: offer.serviceLabel,
        discountText: offer.discountText,
        startsAt: offer.startsAt,
        expiresAt: offer.expiresAt,
        status: offer.status,
      },
      delivery: {
        recipientCount: offer.recipients.length,
        sentCount,
        failedCount,
      },
    },
    { status: 201 },
  );
}
