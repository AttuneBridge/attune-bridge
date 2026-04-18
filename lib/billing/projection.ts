import {
  AppModule,
  ModuleSubscriptionStatus,
  StripeSubscriptionStatus,
} from "@prisma/client";
import type Stripe from "stripe";
import { BILLABLE_MODULES, getModuleForStripePriceId } from "@/lib/billing/catalog";
import { getSubscriptionCurrentPeriodEnd } from "@/lib/billing/stripe-subscription-utils";
import { prisma } from "@/lib/prisma";

function fromUnixTimestamp(timestamp: number | null | undefined) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000);
}

export function toStripeSubscriptionStatus(status: Stripe.Subscription.Status): StripeSubscriptionStatus {
  switch (status) {
    case "incomplete":
      return StripeSubscriptionStatus.INCOMPLETE;
    case "incomplete_expired":
      return StripeSubscriptionStatus.INCOMPLETE_EXPIRED;
    case "trialing":
      return StripeSubscriptionStatus.TRIALING;
    case "active":
      return StripeSubscriptionStatus.ACTIVE;
    case "past_due":
      return StripeSubscriptionStatus.PAST_DUE;
    case "canceled":
      return StripeSubscriptionStatus.CANCELED;
    case "unpaid":
      return StripeSubscriptionStatus.UNPAID;
    case "paused":
      return StripeSubscriptionStatus.PAUSED;
    default:
      return StripeSubscriptionStatus.INCOMPLETE;
  }
}

function getEnabledModulesFromSubscription(subscription: Stripe.Subscription) {
  if (subscription.status === "trialing") {
    return new Set<AppModule>(BILLABLE_MODULES);
  }

  if (subscription.status !== "active") {
    return new Set<AppModule>();
  }

  const enabled = new Set<AppModule>();

  for (const item of subscription.items.data) {
    const priceId = item.price.id;
    const appModule = getModuleForStripePriceId(priceId);

    if (appModule) {
      enabled.add(appModule);
    }
  }

  return enabled;
}

function getStripeItemByModule(subscription: Stripe.Subscription) {
  const result = new Map<AppModule, string>();

  for (const item of subscription.items.data) {
    const appModule = getModuleForStripePriceId(item.price.id);

    if (appModule) {
      result.set(appModule, item.id);
    }
  }

  return result;
}

export async function syncBusinessProjectionFromStripeSubscription(input: {
  businessId: string;
  subscription: Stripe.Subscription;
}) {
  const now = new Date();
  const stripeStatus = toStripeSubscriptionStatus(input.subscription.status);
  const enabledModules = getEnabledModulesFromSubscription(input.subscription);
  const stripeItemByModule = getStripeItemByModule(input.subscription);
  const currentPeriodEnd = fromUnixTimestamp(getSubscriptionCurrentPeriodEnd(input.subscription));
  const trialEnd = fromUnixTimestamp(input.subscription.trial_end);
  const subscriptionStartedAt = fromUnixTimestamp(input.subscription.start_date) ?? now;

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: input.businessId },
      data: {
        stripeSubscriptionId: input.subscription.id,
        stripeStatus,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        stripeTrialEnd: trialEnd,
        stripeCancelAtPeriodEnd: input.subscription.cancel_at_period_end,
        billingSyncedAt: now,
      },
    });

    for (const appModule of BILLABLE_MODULES) {
      const isEnabled = enabledModules.has(appModule);
      const status =
        subscriptionStatusIsTrialing(input.subscription)
          ? ModuleSubscriptionStatus.TRIAL
          : isEnabled
            ? ModuleSubscriptionStatus.ACTIVE
            : ModuleSubscriptionStatus.INACTIVE;

      await tx.businessModuleSubscription.upsert({
        where: {
          businessId_module: {
            businessId: input.businessId,
            module: appModule,
          },
        },
        update: {
          status,
          stripeSubscriptionItemId: stripeItemByModule.get(appModule) ?? null,
          startedAt: isEnabled ? subscriptionStartedAt : null,
          endsAt: isEnabled ? null : currentPeriodEnd ?? now,
        },
        create: {
          businessId: input.businessId,
          module: appModule,
          status,
          stripeSubscriptionItemId: stripeItemByModule.get(appModule) ?? null,
          startedAt: isEnabled ? subscriptionStartedAt : null,
          endsAt: isEnabled ? null : currentPeriodEnd ?? now,
        },
      });
    }
  });
}

function subscriptionStatusIsTrialing(subscription: Stripe.Subscription) {
  return subscription.status === "trialing";
}
