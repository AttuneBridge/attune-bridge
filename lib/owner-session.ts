import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const OWNER_SESSION_COOKIE_NAME = "rb_owner_session";
const DEFAULT_SESSION_TTL_DAYS = 14;

type OwnerSessionPayload = {
  businessId: string;
  locationSlug: string;
  exp: number;
};

function getSecret() {
  if (process.env.OWNER_SESSION_SECRET) {
    return process.env.OWNER_SESSION_SECRET;
  }

  if (process.env.MANAGE_TOKEN_SECRET) {
    return process.env.MANAGE_TOKEN_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "attunebridge-dev-owner-session-secret";
  }

  return null;
}

function signPayload(payloadBase64Url: string, secret: string) {
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url");
}

export function createOwnerSessionToken(input: {
  businessId: string;
  locationSlug: string;
  ttlDays?: number;
}) {
  const secret = getSecret();

  if (!secret || !input.businessId.trim() || !input.locationSlug.trim()) {
    return null;
  }

  const ttlDays = input.ttlDays ?? DEFAULT_SESSION_TTL_DAYS;
  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;

  const payload: OwnerSessionPayload = {
    businessId: input.businessId.trim(),
    locationSlug: input.locationSlug.trim(),
    exp,
  };

  const payloadBase64Url = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(payloadBase64Url, secret);

  return `${payloadBase64Url}.${signature}`;
}

export function verifyOwnerSessionToken(token: string) {
  const secret = getSecret();

  if (!secret) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadBase64Url, providedSignature] = parts;
  if (!payloadBase64Url || !providedSignature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64Url, secret);
  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payloadBase64Url, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<OwnerSessionPayload>;

    if (!parsed.businessId || typeof parsed.businessId !== "string") {
      return null;
    }

    if (!parsed.locationSlug || typeof parsed.locationSlug !== "string") {
      return null;
    }

    if (!parsed.exp || typeof parsed.exp !== "number") {
      return null;
    }

    if (Date.now() > parsed.exp) {
      return null;
    }

    return {
      businessId: parsed.businessId,
      locationSlug: parsed.locationSlug,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export async function getOwnerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyOwnerSessionToken(token);
}

export function isOwnerSessionValidForBusiness(
  sessionToken: string,
  input: { businessId: string; locationSlug?: string },
) {
  const session = verifyOwnerSessionToken(sessionToken);

  if (!session || session.businessId !== input.businessId) {
    return false;
  }

  if (input.locationSlug && session.locationSlug !== input.locationSlug) {
    return false;
  }

  return true;
}
