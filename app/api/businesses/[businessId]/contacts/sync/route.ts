import { BusinessMembershipRole, ContactSource } from "@prisma/client";
import { NextResponse } from "next/server";
import { buildContactProfileUpsert } from "@/lib/contacts";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const identity = await getRequestIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { businessId } = await context.params;
  const membership = await prisma.businessMembership.findFirst({
    where: {
      businessId,
      userId: identity.userId,
      role: BusinessMembershipRole.OWNER,
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [schedulerContacts, feedbackEntries, loyaltyMessages, missedCalls] = await Promise.all([
    prisma.schedulerContact.findMany({
      where: { businessId },
      select: {
        name: true,
        phone: true,
        updatedAt: true,
      },
      take: 500,
    }),
    prisma.feedback.findMany({
      where: {
        location: { businessId },
      },
      select: {
        customerName: true,
        customerEmail: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.loyaltyMessage.findMany({
      where: { businessId },
      select: {
        customerName: true,
        customerEmail: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.missedCallEvent.findMany({
      where: { businessId },
      select: {
        callerPhone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const upserts = [
    ...schedulerContacts.map((entry) =>
      buildContactProfileUpsert({
        businessId,
        fullName: entry.name,
        phone: entry.phone,
        source: ContactSource.SCHEDULER,
        lastInteractionAt: entry.updatedAt,
      }),
    ),
    ...feedbackEntries.map((entry) =>
      buildContactProfileUpsert({
        businessId,
        fullName: entry.customerName,
        email: entry.customerEmail,
        phone: entry.phone,
        source: ContactSource.FEEDBACK,
        lastInteractionAt: entry.createdAt,
      }),
    ),
    ...loyaltyMessages.map((entry) =>
      buildContactProfileUpsert({
        businessId,
        fullName: entry.customerName,
        email: entry.customerEmail,
        source: ContactSource.LOYALTY,
        lastInteractionAt: entry.createdAt,
      }),
    ),
    ...missedCalls.map((entry) =>
      buildContactProfileUpsert({
        businessId,
        phone: entry.callerPhone,
        source: ContactSource.MISSED_CALL,
        lastInteractionAt: entry.createdAt,
      }),
    ),
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  await prisma.$transaction(upserts.map((query) => prisma.contactProfile.upsert(query)));

  const contactCount = await prisma.contactProfile.count({ where: { businessId } });

  return NextResponse.json({
    ok: true,
    synced: upserts.length,
    totalContacts: contactCount,
  });
}
