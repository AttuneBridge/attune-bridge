import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_SESSION_COOKIE_NAME = "attune_demo_owner_session";

type DemoSessionPayload = {
  businessId: string;
  exp: number;
  v: 1;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getDemoSessionSecret() {
  const demoSecret = process.env.DEMO_SESSION_SECRET?.trim();

  if (demoSecret && demoSecret.length >= 32) {
    return demoSecret;
  }

  const fallback = process.env.MANAGE_TOKEN_SECRET?.trim();

  if (fallback && fallback.length >= 32) {
    return fallback;
  }

  return process.env.NODE_ENV === "production"
    ? null
    : "local-demo-secret-change-me-before-production";
}

function createSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createDemoSessionToken(input: {
  businessId: string;
  expiresAt: Date;
}) {
  const secret = getDemoSessionSecret();

  if (!secret) {
    return null;
  }

  const payload: DemoSessionPayload = {
    businessId: input.businessId,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    v: 1,
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = createSignature(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export function verifyDemoSessionToken(token: string): DemoSessionPayload | null {
  const secret = getDemoSessionSecret();

  if (!secret) {
    return null;
  }

  const [payloadEncoded, providedSignature] = token.split(".");

  if (!payloadEncoded || !providedSignature) {
    return null;
  }

  const expectedSignature = createSignature(payloadEncoded, secret);

  if (providedSignature.length !== expectedSignature.length) {
    return null;
  }

  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(fromBase64Url(payloadEncoded)) as DemoSessionPayload;

    if (!decoded || decoded.v !== 1 || typeof decoded.businessId !== "string") {
      return null;
    }

    if (typeof decoded.exp !== "number" || decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
