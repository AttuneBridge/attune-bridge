import { randomBytes } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";

export function normalizePhone(phone: string) {
  return phone.replace(/[^+\d]/g, "");
}

export function createClaimToken() {
  return randomBytes(24).toString("base64url");
}

export function buildSchedulerClaimLink(token: string) {
  return `${getAppUrl()}/scheduler/claim/${encodeURIComponent(token)}`;
}

export function formatSchedulerOfferSms(input: {
  businessName: string;
  startsAt: Date;
  serviceLabel: string;
  discountText: string;
  claimLink: string;
}) {
  const startsAtText = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(input.startsAt);

  return `${input.businessName}: last-minute opening ${startsAtText} for ${input.serviceLabel}. ${input.discountText}. First come first booked: ${input.claimLink} Reply STOP to opt out.`;
}
