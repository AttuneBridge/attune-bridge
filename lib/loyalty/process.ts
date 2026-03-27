import { LoyaltyMessageStatus } from "@prisma/client";
import { sendLoyaltyMessageEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

export async function processLoyaltyMessagesForBusiness(input: {
  businessId: string;
  limit: number;
  source: "manual" | "cron";
}) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { id: true, name: true },
  });

  if (!business) {
    return { notFound: true as const };
  }

  const now = new Date();
  const appUrl = getAppUrl();
  const dueMessages = await prisma.loyaltyMessage.findMany({
    where: {
      businessId: input.businessId,
      status: LoyaltyMessageStatus.PENDING,
      sendAfter: { lte: now },
    },
    include: {
      template: {
        select: {
          subject: true,
          previewText: true,
          body: true,
          ctaLabel: true,
        },
      },
      offer: {
        select: {
          valueText: true,
        },
      },
    },
    orderBy: [{ sendAfter: "asc" }, { createdAt: "asc" }],
    take: input.limit,
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const message of dueMessages) {
    if (!message.customerEmail) {
      skippedCount += 1;
      await prisma.loyaltyMessage.update({
        where: { id: message.id },
        data: {
          status: LoyaltyMessageStatus.SKIPPED,
          skipReason: "missing_customer_email",
        },
      });
      continue;
    }

    if (!message.template) {
      skippedCount += 1;
      await prisma.loyaltyMessage.update({
        where: { id: message.id },
        data: {
          status: LoyaltyMessageStatus.SKIPPED,
          skipReason: "missing_template",
        },
      });
      continue;
    }

    const bookingTrackingLink = `${appUrl}/l/${message.trackingToken}/book`;
    const reviewTrackingLink = `${appUrl}/l/${message.trackingToken}/review`;
    const ctaLower = message.template.ctaLabel.toLowerCase();
    const ctaLooksLikeReview = ctaLower.includes("review");

    const sendResult = await sendLoyaltyMessageEmail({
      toEmail: message.customerEmail,
      customerName: message.customerName,
      businessName: business.name,
      subject: message.template.subject,
      previewText: message.template.previewText,
      body: message.template.body,
      ctaLabel: message.template.ctaLabel,
      offerText: message.offer?.valueText ?? null,
      bookingLink: ctaLooksLikeReview ? reviewTrackingLink : bookingTrackingLink,
      reviewLink: reviewTrackingLink,
    });

    if (sendResult.sent) {
      sentCount += 1;
      await prisma.loyaltyMessage.update({
        where: { id: message.id },
        data: {
          status: LoyaltyMessageStatus.SENT,
          sentAt: new Date(),
          providerMessageId: sendResult.providerMessageId,
          errorMessage: null,
          skipReason: null,
        },
      });
      continue;
    }

    failedCount += 1;
    await prisma.loyaltyMessage.update({
      where: { id: message.id },
      data: {
        status: sendResult.skipped ? LoyaltyMessageStatus.SKIPPED : LoyaltyMessageStatus.FAILED,
        skipReason: sendResult.skipped ? "provider_unconfigured" : null,
        errorMessage: sendResult.errorMessage,
      },
    });
  }

  await trackValidationEvent({
    event: validationEvent.loyaltyMessagesProcessed,
    businessId: input.businessId,
    metadata: {
      source: input.source,
      attempted: dueMessages.length,
      sentCount,
      failedCount,
      skippedCount,
    },
  });

  return {
    notFound: false as const,
    attempted: dueMessages.length,
    sentCount,
    failedCount,
    skippedCount,
  };
}
