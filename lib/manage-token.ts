import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_DAYS = 120;

type ManageTokenPayload = {
  businessId: string;
  exp: number;
};

function getSecret() {
  if (process.env.MANAGE_TOKEN_SECRET) {
    return process.env.MANAGE_TOKEN_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "attunebridge-dev-manage-token-secret";
  }

  return null;
}

function signPayload(payloadBase64Url: string, secret: string) {
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url");
}

export function createManageToken(input: { businessId: string; ttlDays?: number }) {
  const secret = getSecret();

  if (!secret || !input.businessId.trim()) {
    return null;
  }

  const ttlDays = input.ttlDays ?? DEFAULT_TTL_DAYS;
  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;

  const payload: ManageTokenPayload = {
    businessId: input.businessId.trim(),
    exp,
  };

  const payloadBase64Url = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(payloadBase64Url, secret);

  return `${payloadBase64Url}.${signature}`;
}

export function verifyManageToken(token: string) {
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
    const parsed = JSON.parse(decoded) as Partial<ManageTokenPayload>;

    if (!parsed.businessId || typeof parsed.businessId !== "string") {
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
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function isManageTokenValidForBusiness(token: string, businessId: string) {
  const payload = verifyManageToken(token);

  if (!payload) {
    return false;
  }

  return payload.businessId === businessId;
}
