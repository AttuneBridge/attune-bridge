import type Stripe from "stripe";

export function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (periodEnds.length === 0) {
    return null;
  }

  return Math.max(...periodEnds);
}
