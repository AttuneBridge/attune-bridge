import type { StripeSubscriptionStatus } from "@prisma/client";

export type BillingAccessReason =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "missing_subscription";

type BillingAccessInput = {
  stripeStatus: StripeSubscriptionStatus | null;
};

export function evaluateBillingAccess(input: BillingAccessInput): { isActive: boolean; reason: BillingAccessReason } {
  if (!input.stripeStatus) {
    return { isActive: false, reason: "missing_subscription" };
  }

  if (input.stripeStatus === "TRIALING") {
    return { isActive: true, reason: "trialing" };
  }

  if (input.stripeStatus === "ACTIVE") {
    return { isActive: true, reason: "active" };
  }

  if (input.stripeStatus === "PAST_DUE") {
    return { isActive: false, reason: "past_due" };
  }

  if (input.stripeStatus === "CANCELED" || input.stripeStatus === "UNPAID") {
    return { isActive: false, reason: "canceled" };
  }

  return { isActive: false, reason: "incomplete" };
}
