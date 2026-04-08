import { ContactConsentStatus, ContactSource, Prisma } from "@prisma/client";

export function normalizeEmail(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizePhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^+\d]/g, "");
  return digits.length > 0 ? digits : null;
}

export type ContactUpsertInput = {
  businessId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  source: ContactSource;
  lastInteractionAt?: Date | null;
};

export function buildContactProfileUpsert(input: ContactUpsertInput): Prisma.ContactProfileUpsertArgs | null {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);

  if (!normalizedEmail && !normalizedPhone) {
    return null;
  }

  const baseUpdate: Prisma.ContactProfileUpdateInput = {
    fullName: input.fullName?.trim() || undefined,
    email: normalizedEmail ?? undefined,
    phone: normalizedPhone ?? undefined,
    source: input.source,
    ...(input.lastInteractionAt ? { lastInteractionAt: input.lastInteractionAt } : {}),
  };

  if (normalizedPhone) {
    return {
      where: {
        businessId_normalizedPhone: {
          businessId: input.businessId,
          normalizedPhone,
        },
      },
      create: {
        businessId: input.businessId,
        fullName: input.fullName?.trim() || null,
        email: normalizedEmail,
        phone: normalizedPhone,
        normalizedEmail,
        normalizedPhone,
        source: input.source,
        consentStatus: ContactConsentStatus.UNKNOWN,
        lastInteractionAt: input.lastInteractionAt ?? null,
      },
      update: {
        ...baseUpdate,
        normalizedEmail: normalizedEmail ?? undefined,
      },
    };
  }

  return {
    where: {
      businessId_normalizedEmail: {
        businessId: input.businessId,
        normalizedEmail: normalizedEmail!,
      },
    },
    create: {
      businessId: input.businessId,
      fullName: input.fullName?.trim() || null,
      email: normalizedEmail,
      phone: normalizedPhone,
      normalizedEmail,
      normalizedPhone,
      source: input.source,
      consentStatus: ContactConsentStatus.UNKNOWN,
      lastInteractionAt: input.lastInteractionAt ?? null,
    },
    update: {
      ...baseUpdate,
      normalizedPhone: normalizedPhone ?? undefined,
    },
  };
}
