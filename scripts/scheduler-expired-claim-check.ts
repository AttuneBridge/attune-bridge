import { randomBytes } from "node:crypto";
import { SchedulerOfferStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { claimSchedulerOfferByToken } from "../lib/scheduler/claim";

const TEST_CONTACT_COUNT = 8;

function createToken() {
  return randomBytes(24).toString("base64url");
}

async function main() {
  const business = await prisma.business.findUnique({
    where: { email: "owner@democoffee.com" },
    select: { id: true },
  });

  if (!business) {
    throw new Error("Demo business not found. Run `pnpm run prisma:seed` first.");
  }

  const now = Date.now();
  const createdContactIds: string[] = [];
  let offerId: string | null = null;

  try {
    for (let index = 0; index < TEST_CONTACT_COUNT; index += 1) {
      const contact = await prisma.schedulerContact.create({
        data: {
          businessId: business.id,
          name: `Expired Test ${index + 1}`,
          phone: `+1666${String(now).slice(-6)}${String(index).padStart(2, "0")}`,
          isActive: true,
          optedInAt: new Date(),
          notes: "Temporary contact for expired-claim check",
        },
        select: { id: true },
      });

      createdContactIds.push(contact.id);
    }

    const offer = await prisma.schedulerOffer.create({
      data: {
        businessId: business.id,
        serviceLabel: "Expired Claim Test Offer",
        discountText: "Test discount",
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 5 * 60 * 1000),
        status: SchedulerOfferStatus.SENT,
        sentAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      select: { id: true },
    });

    offerId = offer.id;

    const recipients = await Promise.all(
      createdContactIds.map((contactId) =>
        prisma.schedulerOfferRecipient.create({
          data: {
            offerId: offer.id,
            contactId,
            claimToken: createToken(),
          },
          select: { claimToken: true },
        }),
      ),
    );

    const claimResults = await Promise.all(
      recipients.map((recipient) => claimSchedulerOfferByToken(recipient.claimToken)),
    );

    const expiredCount = claimResults.filter((result) => result.status === "expired").length;

    const latestOffer = await prisma.schedulerOffer.findUnique({
      where: { id: offer.id },
      select: {
        status: true,
        claimedByContactId: true,
        claimedAt: true,
      },
    });

    if (!latestOffer) {
      throw new Error("Offer not found after expired claim check.");
    }

    if (expiredCount !== TEST_CONTACT_COUNT) {
      throw new Error(`Expected ${TEST_CONTACT_COUNT} expired results, got ${expiredCount}.`);
    }

    if (
      latestOffer.status !== SchedulerOfferStatus.EXPIRED ||
      latestOffer.claimedByContactId !== null ||
      latestOffer.claimedAt !== null
    ) {
      throw new Error("Offer state is invalid after expired claim check.");
    }

    console.log("Scheduler expired claim check passed.");
    console.log(`- recipients: ${TEST_CONTACT_COUNT}`);
    console.log(`- expired responses: ${expiredCount}`);
  } finally {
    if (offerId) {
      await prisma.schedulerOfferRecipient.deleteMany({ where: { offerId } });
      await prisma.schedulerOffer.delete({ where: { id: offerId } }).catch(() => undefined);
    }

    if (createdContactIds.length > 0) {
      await prisma.schedulerContact.deleteMany({
        where: { id: { in: createdContactIds } },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error("Scheduler expired claim check failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
