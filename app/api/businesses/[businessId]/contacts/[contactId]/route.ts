import {
  BusinessMembershipRole,
  ContactChannelPreference,
  ContactConsentStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

type ContactUpdateBody = {
  consentStatus?: unknown;
  channelPreference?: unknown;
  quietHoursStart?: unknown;
  quietHoursEnd?: unknown;
};

const consentMap: Record<string, ContactConsentStatus> = {
  UNKNOWN: ContactConsentStatus.UNKNOWN,
  OPTED_IN: ContactConsentStatus.OPTED_IN,
  OPTED_OUT: ContactConsentStatus.OPTED_OUT,
};

const channelMap: Record<string, ContactChannelPreference> = {
  NONE: ContactChannelPreference.NONE,
  SMS: ContactChannelPreference.SMS,
  EMAIL: ContactChannelPreference.EMAIL,
  CALL: ContactChannelPreference.CALL,
};

function parseQuietHours(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : undefined;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string; contactId: string }> },
) {
  const identity = await getRequestIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { businessId, contactId } = await context.params;
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

  let body: ContactUpdateBody;

  try {
    body = (await request.json()) as ContactUpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const consentRaw = typeof body.consentStatus === "string" ? body.consentStatus.trim() : "";
  const channelRaw = typeof body.channelPreference === "string" ? body.channelPreference.trim() : "";
  const quietHoursStart = parseQuietHours(body.quietHoursStart);
  const quietHoursEnd = parseQuietHours(body.quietHoursEnd);

  if (quietHoursStart === undefined || quietHoursEnd === undefined) {
    return NextResponse.json({ error: "Quiet hours must be HH:MM format." }, { status: 400 });
  }

  if (!consentRaw || !(consentRaw in consentMap)) {
    return NextResponse.json({ error: "Valid consent status is required." }, { status: 400 });
  }

  if (!channelRaw || !(channelRaw in channelMap)) {
    return NextResponse.json({ error: "Valid channel preference is required." }, { status: 400 });
  }

  const updated = await prisma.contactProfile.updateMany({
    where: {
      id: contactId,
      businessId,
    },
    data: {
      consentStatus: consentMap[consentRaw],
      channelPreference: channelMap[channelRaw],
      quietHoursStart,
      quietHoursEnd,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
