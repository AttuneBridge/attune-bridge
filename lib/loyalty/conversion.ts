import { LoyaltyConversionType } from "@prisma/client";
import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

export async function captureConversionAndGetRedirect(input: {
  trackingToken: string;
  type: LoyaltyConversionType;
}) {
  const appUrl = getAppUrl();
  const fallbackUrl = `${appUrl}/thanks`;

  const message = await prisma.loyaltyMessage.findUnique({
    where: { trackingToken: input.trackingToken },
    select: {
      id: true,
      businessId: true,
      location: {
        select: {
          reviewLink: true,
          googleReviewLink: true,
          yelpReviewLink: true,
        },
      },
    },
  });

  if (!message) {
    return {
      found: false as const,
      redirectUrl: fallbackUrl,
    };
  }

  await prisma.loyaltyConversion.upsert({
    where: {
      messageId_type: {
        messageId: message.id,
        type: input.type,
      },
    },
    update: {
      convertedAt: new Date(),
    },
    create: {
      businessId: message.businessId,
      messageId: message.id,
      type: input.type,
    },
  });

  const bookingRedirect = process.env.LOYALTY_DEFAULT_BOOKING_LINK?.trim() || fallbackUrl;
  const reviewRedirect =
    message.location?.googleReviewLink?.trim() ||
    message.location?.reviewLink?.trim() ||
    message.location?.yelpReviewLink?.trim() ||
    fallbackUrl;

  return {
    found: true as const,
    redirectUrl: input.type === LoyaltyConversionType.REVIEW ? reviewRedirect : bookingRedirect,
  };
}
