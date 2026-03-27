import { SchedulerOfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SchedulerClaimResult =
  | {
      status: "claimed";
      offerId: string;
      businessId: string;
      businessName: string;
      serviceLabel: string;
      discountText: string;
      startsAt: Date;
    }
  | {
      status: "already_claimed";
      offerId: string;
      businessId: string;
      businessName: string;
      serviceLabel: string;
      claimedByName: string | null;
      startsAt: Date;
    }
  | {
      status: "expired" | "closed" | "invalid";
      offerId?: string;
      businessId?: string;
      businessName?: string;
      serviceLabel?: string;
      startsAt?: Date;
    };

function resolveNonClaimableStatus(status: SchedulerOfferStatus): "expired" | "closed" {
  if (status === SchedulerOfferStatus.EXPIRED) {
    return "expired";
  }

  return "closed";
}

export async function claimSchedulerOfferByToken(rawToken: string): Promise<SchedulerClaimResult> {
  const token = rawToken.trim();

  if (!token) {
    return { status: "invalid" };
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const recipient = await tx.schedulerOfferRecipient.findUnique({
      where: { claimToken: token },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
          },
        },
        offer: {
          select: {
            id: true,
            businessId: true,
            serviceLabel: true,
            discountText: true,
            startsAt: true,
            expiresAt: true,
            status: true,
            claimedAt: true,
            business: {
              select: {
                name: true,
              },
            },
            claimedByContact: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!recipient) {
      return { status: "invalid" };
    }

    const offer = recipient.offer;

    if (recipient.claimedAt || offer.status === SchedulerOfferStatus.CLAIMED || offer.claimedAt) {
      return {
        status: "already_claimed",
        offerId: offer.id,
        businessId: offer.businessId,
        businessName: offer.business.name,
        serviceLabel: offer.serviceLabel,
        claimedByName: offer.claimedByContact?.name ?? null,
        startsAt: offer.startsAt,
      };
    }

    if (offer.expiresAt && offer.expiresAt <= now) {
      if (offer.status === SchedulerOfferStatus.SENT) {
        await tx.schedulerOffer.update({
          where: { id: offer.id },
          data: {
            status: SchedulerOfferStatus.EXPIRED,
            closedAt: now,
          },
        });
      }

      return {
        status: "expired",
        offerId: offer.id,
        businessId: offer.businessId,
        businessName: offer.business.name,
        serviceLabel: offer.serviceLabel,
        startsAt: offer.startsAt,
      };
    }

    if (offer.status !== SchedulerOfferStatus.SENT) {
      return {
        status: resolveNonClaimableStatus(offer.status),
        offerId: offer.id,
        businessId: offer.businessId,
        businessName: offer.business.name,
        serviceLabel: offer.serviceLabel,
        startsAt: offer.startsAt,
      };
    }

    const claimUpdate = await tx.schedulerOffer.updateMany({
      where: {
        id: offer.id,
        status: SchedulerOfferStatus.SENT,
        claimedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: {
        status: SchedulerOfferStatus.CLAIMED,
        claimedAt: now,
        claimedByContactId: recipient.contact.id,
      },
    });

    if (claimUpdate.count === 0) {
      const latest = await tx.schedulerOffer.findUnique({
        where: { id: offer.id },
        select: {
          status: true,
          claimedByContact: {
            select: {
              name: true,
            },
          },
        },
      });

      if (latest?.status === SchedulerOfferStatus.CLAIMED) {
        return {
          status: "already_claimed",
          offerId: offer.id,
          businessId: offer.businessId,
          businessName: offer.business.name,
          serviceLabel: offer.serviceLabel,
          claimedByName: latest.claimedByContact?.name ?? null,
          startsAt: offer.startsAt,
        };
      }

      return {
        status: latest ? resolveNonClaimableStatus(latest.status) : "closed",
        offerId: offer.id,
        businessId: offer.businessId,
        businessName: offer.business.name,
        serviceLabel: offer.serviceLabel,
        startsAt: offer.startsAt,
      };
    }

    await tx.schedulerOfferRecipient.update({
      where: { id: recipient.id },
      data: {
        claimedAt: now,
      },
    });

    return {
      status: "claimed",
      offerId: offer.id,
      businessId: offer.businessId,
      businessName: offer.business.name,
      serviceLabel: offer.serviceLabel,
      discountText: offer.discountText,
      startsAt: offer.startsAt,
    };
  }, {
    maxWait: 5_000,
    timeout: 15_000,
  });
}
