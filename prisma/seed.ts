import {
  AppModule,
  BusinessMembershipRole,
  FollowUpPreference,
  LoyaltyAudience,
  LoyaltyConversionType,
  LoyaltyMessageStatus,
  LoyaltyOfferKind,
  LoyaltyPlaybookStatus,
  LoyaltyPlaybookType,
  LoyaltyTemplateCategory,
  LoyaltyTrigger,
  ModuleSubscriptionStatus,
  PrismaClient,
  SchedulerOfferStatus,
  SchedulerRecipientSmsStatus,
  Sentiment,
  SubscriptionStatus,
  SystemRole,
} from "@prisma/client";

export async function seedDemoData(prisma: PrismaClient) {
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const business = await prisma.business.upsert({
    where: { email: "owner@democoffee.com" },
    update: {
      name: "Demo Coffee Co",
      subscriptionStatus: SubscriptionStatus.TRIAL_ACTIVE,
      trialStartedAt: now,
      trialEndsAt,
      paidThrough: null,
      autoRenewEnabled: false,
      deactivatedAt: null,
      instantEmailNeutral: true,
      instantEmailNegative: true,
      smsNegativeEnabled: false,
      alertPhone: "+15550100099",
    },
    create: {
      name: "Demo Coffee Co",
      email: "owner@democoffee.com",
      subscriptionStatus: SubscriptionStatus.TRIAL_ACTIVE,
      trialStartedAt: now,
      trialEndsAt,
      paidThrough: null,
      autoRenewEnabled: false,
      deactivatedAt: null,
      instantEmailNeutral: true,
      instantEmailNegative: true,
      smsNegativeEnabled: false,
      alertPhone: "+15550100099",
    },
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@democoffee.com" },
    update: {
      systemRole: SystemRole.USER,
    },
    create: {
      email: "owner@democoffee.com",
      systemRole: SystemRole.USER,
    },
  });

  await prisma.businessMembership.upsert({
    where: {
      userId_businessId: {
        userId: ownerUser.id,
        businessId: business.id,
      },
    },
    update: {
      role: BusinessMembershipRole.OWNER,
    },
    create: {
      userId: ownerUser.id,
      businessId: business.id,
      role: BusinessMembershipRole.OWNER,
    },
  });

  const location = await prisma.location.upsert({
    where: { slug: "demo-coffee-downtown" },
    update: {
      name: "Downtown",
      reviewLink: "https://example.com/review/demo-coffee-downtown",
      googleReviewLink: "https://g.page/r/demo-coffee/review",
      yelpReviewLink: "https://www.yelp.com/writeareview/biz/demo-coffee",
      businessId: business.id,
    },
    create: {
      businessId: business.id,
      name: "Downtown",
      slug: "demo-coffee-downtown",
      reviewLink: "https://example.com/review/demo-coffee-downtown",
      googleReviewLink: "https://g.page/r/demo-coffee/review",
      yelpReviewLink: "https://www.yelp.com/writeareview/biz/demo-coffee",
    },
  });

  const moduleSeeds = [AppModule.SCHEDULER, AppModule.LOYALTY, AppModule.MISSED_CALL_TEXTBACK];

  for (const module of moduleSeeds) {
    await prisma.businessModuleSubscription.upsert({
      where: {
        businessId_module: {
          businessId: business.id,
          module,
        },
      },
      update: {
        status: ModuleSubscriptionStatus.TRIAL,
        startedAt: now,
        endsAt: trialEndsAt,
      },
      create: {
        businessId: business.id,
        module,
        status: ModuleSubscriptionStatus.TRIAL,
        startedAt: now,
        endsAt: trialEndsAt,
      },
    });
  }

  await prisma.feedback.deleteMany({ where: { locationId: location.id } });

  await prisma.schedulerOfferRecipient.deleteMany({
    where: {
      offer: {
        businessId: business.id,
      },
    },
  });

  await prisma.schedulerOffer.deleteMany({ where: { businessId: business.id } });
  await prisma.schedulerContact.deleteMany({ where: { businessId: business.id } });
  await prisma.missedCallEvent.deleteMany({ where: { businessId: business.id } });
  await prisma.missedCallConfig.deleteMany({ where: { businessId: business.id } });

  await prisma.loyaltyConversion.deleteMany({
    where: {
      businessId: business.id,
    },
  });

  await prisma.loyaltyMessage.deleteMany({
    where: {
      businessId: business.id,
    },
  });

  await prisma.loyaltyPlaybook.deleteMany({
    where: {
      businessId: business.id,
    },
  });

  await prisma.loyaltyTemplate.deleteMany({
    where: {
      businessId: business.id,
    },
  });

  await prisma.loyaltyOffer.deleteMany({
    where: {
      businessId: business.id,
    },
  });

  const schedulerContacts = await prisma.schedulerContact.createMany({
    data: [
      {
        businessId: business.id,
        name: "Avery",
        phone: "+15550100001",
        isActive: true,
        notes: "Prefers afternoon appointments",
        optedInAt: now,
      },
      {
        businessId: business.id,
        name: "Morgan",
        phone: "+15550100002",
        isActive: true,
        notes: "Can arrive within 30 minutes",
        optedInAt: now,
      },
      {
        businessId: business.id,
        name: "Casey",
        phone: "+15550100003",
        isActive: true,
        optedInAt: now,
      },
      {
        businessId: business.id,
        name: "Riley",
        phone: "+15550100004",
        isActive: false,
        notes: "Temporarily paused",
        optedInAt: now,
      },
    ],
  });

  const seededContacts = await prisma.schedulerContact.findMany({
    where: {
      businessId: business.id,
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 2,
  });

  if (schedulerContacts.count > 0 && seededContacts.length > 0) {
    const sampleOffer = await prisma.schedulerOffer.create({
      data: {
        businessId: business.id,
        locationId: location.id,
        serviceLabel: "Express haircut",
        discountText: "20% off if claimed now",
        startsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() + 45 * 60 * 1000),
        status: SchedulerOfferStatus.SENT,
        sentAt: now,
      },
      select: {
        id: true,
      },
    });

    await prisma.schedulerOfferRecipient.createMany({
      data: seededContacts.map((contact) => ({
        offerId: sampleOffer.id,
        contactId: contact.id,
        claimToken: `${sampleOffer.id}-${contact.id}`,
        smsStatus: SchedulerRecipientSmsStatus.SKIPPED,
        smsErrorMessage: "Seeded demo recipient",
      })),
    });
  }

  await prisma.feedback.createMany({
    data: [
      {
        locationId: location.id,
        sentiment: Sentiment.NEGATIVE,
        message: "My drink took a long time and the order was wrong.",
        wantsFollowUp: true,
        followUpPreference: FollowUpPreference.TEXT,
        phone: "555-123-4567",
        customerName: "Taylor",
        customerEmail: "taylor@example.com",
      },
      {
        locationId: location.id,
        sentiment: Sentiment.NEUTRAL,
        message: "The staff was kind, but the shop was very busy and hard to navigate.",
        wantsFollowUp: true,
        followUpPreference: FollowUpPreference.EMAIL,
        customerName: "Jordan",
        customerEmail: "jordan@example.com",
      },
      {
        locationId: location.id,
        sentiment: Sentiment.POSITIVE,
        message: "Great coffee and really friendly service.",
        wantsFollowUp: false,
        customerName: "Alex",
        customerEmail: "alex@example.com",
      },
    ],
  });

  await prisma.missedCallConfig.create({
    data: {
      businessId: business.id,
      twilioPhone: "+15550100123",
      autoReplyMessage: "Hey - sorry we missed your call. How can we help?",
      isActive: true,
    },
  });

  const loyaltyOffers = await prisma.$transaction([
    prisma.loyaltyOffer.create({
      data: {
        businessId: business.id,
        name: "$10 off next visit",
        kind: LoyaltyOfferKind.FLAT_DISCOUNT,
        valueText: "$10 off your next appointment",
        validDays: 14,
        code: "WELCOME10",
        isActive: true,
      },
    }),
    prisma.loyaltyOffer.create({
      data: {
        businessId: business.id,
        name: "Free add-on",
        kind: LoyaltyOfferKind.FREE_ADD_ON,
        valueText: "Free premium add-on with your next booking",
        validDays: 21,
        isActive: true,
      },
    }),
  ]);

  const loyaltyTemplates = await prisma.$transaction([
    prisma.loyaltyTemplate.create({
      data: {
        businessId: business.id,
        name: "Great follow-up default",
        category: LoyaltyTemplateCategory.GREAT,
        subject: "Thanks for visiting Demo Coffee Co",
        previewText: "A quick thank-you and a reward for your next visit",
        body: "Hi {first_name}, thanks for visiting {business_name}. If you had a great visit, please leave a quick review. We also saved {offer_text} for your next visit.",
        ctaLabel: "Book My Next Visit",
        isDefault: true,
      },
    }),
    prisma.loyaltyTemplate.create({
      data: {
        businessId: business.id,
        name: "Okay recovery default",
        category: LoyaltyTemplateCategory.OKAY,
        subject: "We appreciate your feedback",
        previewText: "We would love another chance to serve you better",
        body: "Hi {first_name}, thank you for your feedback. We want your next visit to be smoother and better. Here is {offer_text} for your next booking.",
        ctaLabel: "Book Again",
        isDefault: true,
      },
    }),
    prisma.loyaltyTemplate.create({
      data: {
        businessId: business.id,
        name: "Not good recovery default",
        category: LoyaltyTemplateCategory.NOT_GOOD,
        subject: "We want to make this right",
        previewText: "Thanks for sharing your experience with us",
        body: "Hi {first_name}, we are sorry your visit missed the mark. We want to make it right and would appreciate the chance to follow up.",
        ctaLabel: "Schedule Follow-up",
        isDefault: true,
      },
    }),
    prisma.loyaltyTemplate.create({
      data: {
        businessId: business.id,
        name: "We miss you default",
        category: LoyaltyTemplateCategory.LAPSED,
        subject: "We miss seeing you at Demo Coffee Co",
        previewText: "A small offer for your next visit",
        body: "Hi {first_name}, it has been a little while. If you want to come back, here is {offer_text} to make your next visit easy.",
        ctaLabel: "Book Now",
        isDefault: true,
      },
    }),
  ]);

  const [positiveFeedback, neutralFeedback, negativeFeedback] = await Promise.all([
    prisma.feedback.findFirst({
      where: { locationId: location.id, sentiment: Sentiment.POSITIVE },
      orderBy: { createdAt: "desc" },
      select: { id: true, customerEmail: true, customerName: true },
    }),
    prisma.feedback.findFirst({
      where: { locationId: location.id, sentiment: Sentiment.NEUTRAL },
      orderBy: { createdAt: "desc" },
      select: { id: true, customerEmail: true, customerName: true },
    }),
    prisma.feedback.findFirst({
      where: { locationId: location.id, sentiment: Sentiment.NEGATIVE },
      orderBy: { createdAt: "desc" },
      select: { id: true, customerEmail: true, customerName: true },
    }),
  ]);

  const playbooks = await prisma.$transaction([
    prisma.loyaltyPlaybook.create({
      data: {
        businessId: business.id,
        name: "2nd Visit Booster",
        type: LoyaltyPlaybookType.SECOND_VISIT_BOOSTER,
        status: LoyaltyPlaybookStatus.ACTIVE,
        audience: LoyaltyAudience.FIRST_TIME,
        trigger: LoyaltyTrigger.FEEDBACK_POSITIVE,
        delayHours: 48,
        suppressIfBooked: true,
        offerId: loyaltyOffers[0].id,
        templateId: loyaltyTemplates[0].id,
        startedAt: now,
      },
    }),
    prisma.loyaltyPlaybook.create({
      data: {
        businessId: business.id,
        name: "Service Recovery",
        type: LoyaltyPlaybookType.SERVICE_RECOVERY,
        status: LoyaltyPlaybookStatus.ACTIVE,
        audience: LoyaltyAudience.REPEAT,
        trigger: LoyaltyTrigger.FEEDBACK_NEUTRAL,
        delayHours: 24,
        suppressIfBooked: true,
        offerId: loyaltyOffers[1].id,
        templateId: loyaltyTemplates[1].id,
        startedAt: now,
      },
    }),
    prisma.loyaltyPlaybook.create({
      data: {
        businessId: business.id,
        name: "Private Recovery Queue",
        type: LoyaltyPlaybookType.SERVICE_RECOVERY,
        status: LoyaltyPlaybookStatus.ACTIVE,
        audience: LoyaltyAudience.REPEAT,
        trigger: LoyaltyTrigger.FEEDBACK_NEGATIVE,
        delayHours: 4,
        suppressIfBooked: true,
        templateId: loyaltyTemplates[2].id,
        startedAt: now,
      },
    }),
  ]);

  const seededLoyaltyMessages = await prisma.$transaction([
    prisma.loyaltyMessage.create({
      data: {
        businessId: business.id,
        locationId: location.id,
        playbookId: playbooks[0].id,
        templateId: loyaltyTemplates[0].id,
        offerId: loyaltyOffers[0].id,
        feedbackId: positiveFeedback?.id ?? null,
        customerName: positiveFeedback?.customerName ?? "Alex",
        customerEmail: positiveFeedback?.customerEmail ?? "alex@example.com",
        status: LoyaltyMessageStatus.SENT,
        sendAfter: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        sentAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.loyaltyMessage.create({
      data: {
        businessId: business.id,
        locationId: location.id,
        playbookId: playbooks[1].id,
        templateId: loyaltyTemplates[1].id,
        offerId: loyaltyOffers[1].id,
        feedbackId: neutralFeedback?.id ?? null,
        customerName: neutralFeedback?.customerName ?? "Jordan",
        customerEmail: neutralFeedback?.customerEmail ?? "jordan@example.com",
        status: LoyaltyMessageStatus.PENDING,
        sendAfter: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      },
    }),
    prisma.loyaltyMessage.create({
      data: {
        businessId: business.id,
        locationId: location.id,
        playbookId: playbooks[2].id,
        templateId: loyaltyTemplates[2].id,
        feedbackId: negativeFeedback?.id ?? null,
        customerName: negativeFeedback?.customerName ?? "Taylor",
        customerEmail: negativeFeedback?.customerEmail ?? "taylor@example.com",
        status: LoyaltyMessageStatus.SENT,
        sendAfter: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        sentAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
    }),
  ]);

  await prisma.loyaltyConversion.create({
    data: {
      businessId: business.id,
      messageId: seededLoyaltyMessages[0].id,
      type: LoyaltyConversionType.REVIEW,
      metadata: {
        source: "seed",
      },
    },
  });
}

async function main() {
  const prisma = new PrismaClient();

  try {
    await seedDemoData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectSeedRun = process.argv[1]?.endsWith("prisma/seed.ts");

if (isDirectSeedRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
