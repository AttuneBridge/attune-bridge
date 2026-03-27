import { randomBytes } from "node:crypto";
import { SchedulerOfferStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { claimSchedulerOfferByToken } from "../lib/scheduler/claim";

const TEST_CONTACT_COUNT = 12;

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
          name: `Race Test ${index + 1}`,
          phone: `+1555${String(now).slice(-6)}${String(index).padStart(2, "0")}`,
          isActive: true,
          optedInAt: new Date(),
          notes: "Temporary contact for race-condition check",
        },
        select: { id: true },
      });

      createdContactIds.push(contact.id);
    }

    const offer = await prisma.schedulerOffer.create({
      data: {
        businessId: business.id,
        serviceLabel: "Race Condition Test Offer",
        discountText: "Test discount",
        startsAt: new Date(Date.now() + 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: SchedulerOfferStatus.SENT,
        sentAt: new Date(),
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

    const claimedCount = claimResults.filter((result) => result.status === "claimed").length;
    const alreadyClaimedCount = claimResults.filter((result) => result.status === "already_claimed").length;

    const latestOffer = await prisma.schedulerOffer.findUnique({
      where: { id: offer.id },
      select: {
        status: true,
        claimedByContactId: true,
        claimedAt: true,
      },
    });

    if (!latestOffer) {
      throw new Error("Offer not found after claim race check.");
    }

    if (claimedCount !== 1) {
      throw new Error(`Expected exactly one successful claim, got ${claimedCount}.`);
    }

    if (alreadyClaimedCount !== TEST_CONTACT_COUNT - 1) {
      throw new Error(
        `Expected ${TEST_CONTACT_COUNT - 1} already-claimed results, got ${alreadyClaimedCount}.`,
      );
    }

    if (
      latestOffer.status !== SchedulerOfferStatus.CLAIMED ||
      !latestOffer.claimedByContactId ||
      !latestOffer.claimedAt
    ) {
      throw new Error("Offer state is invalid after race check.");
    }

    console.log("Scheduler claim race check passed.");
    console.log(`- recipients: ${TEST_CONTACT_COUNT}`);
    console.log(`- successful claims: ${claimedCount}`);
    console.log(`- rejected as already claimed: ${alreadyClaimedCount}`);
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
    console.error("Scheduler claim race check failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
