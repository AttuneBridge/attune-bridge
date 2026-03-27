import {
  LoyaltyPlaybookStatus,
  LoyaltyMessageStatus,
  LoyaltyTemplateCategory,
  LoyaltyTrigger,
  Sentiment,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

function getTriggerFromSentiment(sentiment: Sentiment) {
  if (sentiment === Sentiment.POSITIVE) {
    return LoyaltyTrigger.FEEDBACK_POSITIVE;
  }

  if (sentiment === Sentiment.NEUTRAL) {
    return LoyaltyTrigger.FEEDBACK_NEUTRAL;
  }

  return LoyaltyTrigger.FEEDBACK_NEGATIVE;
}

function getTemplateCategoryFromSentiment(sentiment: Sentiment) {
  if (sentiment === Sentiment.POSITIVE) {
    return LoyaltyTemplateCategory.GREAT;
  }

  if (sentiment === Sentiment.NEUTRAL) {
    return LoyaltyTemplateCategory.OKAY;
  }

  return LoyaltyTemplateCategory.NOT_GOOD;
}

export async function queueLoyaltyMessagesFromFeedback(input: {
  businessId: string;
  locationId: string;
  feedbackId: string;
  sentiment: Sentiment;
  customerName: string | null;
  customerEmail: string | null;
}) {
  const trigger = getTriggerFromSentiment(input.sentiment);
  const templateCategory = getTemplateCategoryFromSentiment(input.sentiment);

  const [playbooks, fallbackTemplate] = await Promise.all([
    prisma.loyaltyPlaybook.findMany({
      where: {
        businessId: input.businessId,
        status: LoyaltyPlaybookStatus.ACTIVE,
        trigger,
      },
      include: {
        template: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.loyaltyTemplate.findFirst({
      where: {
        businessId: input.businessId,
        category: templateCategory,
        isDefault: true,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  if (playbooks.length === 0) {
    return { queuedCount: 0, skippedCount: 0 };
  }

  let queuedCount = 0;
  let skippedCount = 0;

  for (const playbook of playbooks) {
    const hasEmail = Boolean(input.customerEmail && input.customerEmail.trim().length > 0);
    const templateId = playbook.template?.id ?? fallbackTemplate?.id ?? null;
    const status = hasEmail ? LoyaltyMessageStatus.PENDING : LoyaltyMessageStatus.SKIPPED;
    const skipReason = hasEmail ? null : "missing_customer_email";
    const sendAfter = new Date(Date.now() + playbook.delayHours * 60 * 60 * 1000);

    await prisma.loyaltyMessage.create({
      data: {
        businessId: input.businessId,
        locationId: input.locationId,
        playbookId: playbook.id,
        templateId,
        offerId: playbook.offerId,
        feedbackId: input.feedbackId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        status,
        sendAfter,
        skipReason,
      },
      select: {
        id: true,
      },
    });

    if (status === LoyaltyMessageStatus.PENDING) {
      queuedCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  await trackValidationEvent({
    event: validationEvent.loyaltyMessagesQueued,
    businessId: input.businessId,
    locationId: input.locationId,
    metadata: {
      feedbackId: input.feedbackId,
      trigger,
      queuedCount,
      skippedCount,
    },
  });

  return { queuedCount, skippedCount };
}
