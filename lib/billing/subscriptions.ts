import { AppModule, ModuleChangeAction, ModuleChangeRequestStatus } from "@prisma/client";
import type Stripe from "stripe";
import { getAppUrl } from "@/lib/app-url";
import { getStripeClient } from "@/lib/billing/client";
import {
  BILLABLE_MODULES,
  getModuleForStripePriceId,
  getStripePriceIdForModule,
  isBillableModule,
} from "@/lib/billing/catalog";
import { syncBusinessProjectionFromStripeSubscription } from "@/lib/billing/projection";
import { getSubscriptionCurrentPeriodEnd } from "@/lib/billing/stripe-subscription-utils";
import { prisma } from "@/lib/prisma";

function getModuleLineItems() {
  return BILLABLE_MODULES.map((module) => ({
    price: getStripePriceIdForModule(module),
    quantity: 1,
  }));
}

async function ensureStripeCustomerForBusiness(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      email: true,
      stripeCustomerId: true,
    },
  });

  if (!business) {
    throw new Error("Business not found.");
  }

  if (business.stripeCustomerId) {
    return {
      customerId: business.stripeCustomerId,
      business,
    };
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: business.email,
    name: business.name,
    metadata: {
      businessId: business.id,
    },
  });

  await prisma.business.update({
    where: { id: business.id },
    data: {
      stripeCustomerId: customer.id,
      billingSyncedAt: new Date(),
    },
  });

  return {
    customerId: customer.id,
    business,
  };
}

export async function createSubscriptionCheckoutSession(input: {
  businessId: string;
  successPath?: string;
  cancelPath?: string;
}) {
  const stripe = getStripeClient();
  const { customerId } = await ensureStripeCustomerForBusiness(input.businessId);

  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: {
      stripeStatus: true,
      stripeSubscriptionId: true,
    },
  });

  if (!business) {
    throw new Error("Business not found.");
  }

  if (
    business.stripeSubscriptionId &&
    (business.stripeStatus === "ACTIVE" || business.stripeStatus === "TRIALING")
  ) {
    return { checkoutUrl: null };
  }

  const appUrl = getAppUrl();
  const successPath = input.successPath ?? "/dashboard/settings";
  const cancelPath = input.cancelPath ?? "/dashboard/settings";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: getModuleLineItems(),
    success_url: `${appUrl}${successPath}`,
    cancel_url: `${appUrl}${cancelPath}`,
    client_reference_id: input.businessId,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        businessId: input.businessId,
      },
    },
    metadata: {
      businessId: input.businessId,
    },
  });

  return { checkoutUrl: session.url ?? null };
}

export async function createBillingPortalSession(input: {
  businessId: string;
  returnPath?: string;
}) {
  const stripe = getStripeClient();
  const { customerId } = await ensureStripeCustomerForBusiness(input.businessId);
  const appUrl = getAppUrl();
  const returnPath = input.returnPath ?? "/dashboard/settings";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}${returnPath}`,
  });

  return {
    portalUrl: session.url,
  };
}

export async function provisionTrialSubscriptionForBusiness(businessId: string) {
  const stripe = getStripeClient();
  const { customerId } = await ensureStripeCustomerForBusiness(businessId);

  const existing = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      stripeSubscriptionId: true,
    },
  });

  if (existing?.stripeSubscriptionId) {
    return;
  }

  const subscription = (await stripe.subscriptions.create({
    customer: customerId,
    items: getModuleLineItems(),
    trial_period_days: 30,
    metadata: {
      businessId,
    },
  })) as unknown as Stripe.Subscription;

  await syncBusinessProjectionFromStripeSubscription({
    businessId,
    subscription,
  });
}

async function getBusinessSubscriptionOrThrow(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      stripeSubscriptionId: true,
    },
  });

  if (!business?.stripeSubscriptionId) {
    throw new Error("No Stripe subscription found for business.");
  }

  return business.stripeSubscriptionId;
}

export async function cancelSubscriptionAtPeriodEnd(businessId: string) {
  const stripe = getStripeClient();
  const subscriptionId = await getBusinessSubscriptionOrThrow(businessId);

  const subscription = (await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })) as unknown as Stripe.Subscription;

  await syncBusinessProjectionFromStripeSubscription({
    businessId,
    subscription,
  });

  return subscription;
}

export async function resumeSubscriptionRenewal(businessId: string) {
  const stripe = getStripeClient();
  const subscriptionId = await getBusinessSubscriptionOrThrow(businessId);
  const subscription = (await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })) as unknown as Stripe.Subscription;

  await syncBusinessProjectionFromStripeSubscription({
    businessId,
    subscription,
  });

  return subscription;
}

export async function activateModuleOnSubscription(input: {
  businessId: string;
  module: AppModule;
}) {
  if (!isBillableModule(input.module)) {
    throw new Error("Unsupported module for Stripe billing.");
  }

  const moduleKey = input.module;

  const stripe = getStripeClient();
  const subscriptionId = await getBusinessSubscriptionOrThrow(input.businessId);
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription;
  const priceId = getStripePriceIdForModule(moduleKey);

  const alreadyPresent = subscription.items.data.some((item) => item.price.id === priceId);

  if (!alreadyPresent) {
    const updated = (await stripe.subscriptions.update(subscriptionId, {
      proration_behavior: "create_prorations",
      items: [...subscription.items.data.map((item) => ({ id: item.id })), { price: priceId, quantity: 1 }],
    })) as unknown as Stripe.Subscription;

    await syncBusinessProjectionFromStripeSubscription({
      businessId: input.businessId,
      subscription: updated,
    });
  } else {
    await syncBusinessProjectionFromStripeSubscription({
      businessId: input.businessId,
      subscription,
    });
  }

  await prisma.moduleChangeRequest.updateMany({
    where: {
      businessId: input.businessId,
      module: moduleKey,
      action: ModuleChangeAction.DEACTIVATE,
      status: ModuleChangeRequestStatus.PENDING,
    },
    data: {
      status: ModuleChangeRequestStatus.CANCELED,
      appliedAt: new Date(),
      errorMessage: "Canceled by module re-activation.",
    },
  });
}

export async function scheduleModuleDeactivation(input: {
  businessId: string;
  module: AppModule;
}) {
  if (!isBillableModule(input.module)) {
    throw new Error("Unsupported module for Stripe billing.");
  }

  const moduleKey = input.module;

  const stripe = getStripeClient();
  const subscriptionId = await getBusinessSubscriptionOrThrow(input.businessId);
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription;
  const currentPeriodEnd = getSubscriptionCurrentPeriodEnd(subscription);

  if (!currentPeriodEnd) {
    throw new Error("Could not determine current subscription period end.");
  }

  const effectiveAt = new Date(currentPeriodEnd * 1000);
  const existingItem = subscription.items.data.find(
    (item) => item.price.id === getStripePriceIdForModule(moduleKey),
  );

  await prisma.moduleChangeRequest.upsert({
    where: {
      id: `${input.businessId}:${input.module}:deactivate`,
    },
    update: {
      status: ModuleChangeRequestStatus.PENDING,
      effectiveAt,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: existingItem?.id ?? null,
      errorMessage: null,
      appliedAt: null,
    },
    create: {
      id: `${input.businessId}:${input.module}:deactivate`,
      businessId: input.businessId,
      module: moduleKey,
      action: ModuleChangeAction.DEACTIVATE,
      status: ModuleChangeRequestStatus.PENDING,
      effectiveAt,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: existingItem?.id ?? null,
    },
  });

  await syncBusinessProjectionFromStripeSubscription({
    businessId: input.businessId,
    subscription,
  });

  return {
    effectiveAt,
  };
}

export async function applyDueModuleChangesForBusiness(input: {
  businessId: string;
  subscription: Stripe.Subscription;
}) {
  const due = await prisma.moduleChangeRequest.findMany({
    where: {
      businessId: input.businessId,
      action: ModuleChangeAction.DEACTIVATE,
      status: ModuleChangeRequestStatus.PENDING,
      effectiveAt: { lte: new Date() },
    },
    orderBy: {
      effectiveAt: "asc",
    },
  });

  if (due.length === 0) {
    return input.subscription;
  }

  const stripe = getStripeClient();
  const modulesToRemove = new Set(due.map((request) => request.module));
  const itemIdsToRemove = new Set(
    input.subscription.items.data
      .filter((item) => {
        const appModule = getModuleForStripePriceId(item.price.id);
        return appModule ? modulesToRemove.has(appModule) : false;
      })
      .map((item) => item.id),
  );

  const updated = (await stripe.subscriptions.update(input.subscription.id, {
    proration_behavior: "none",
    items: input.subscription.items.data
      .filter((item) => !itemIdsToRemove.has(item.id))
      .map((item) => ({ id: item.id })),
  })) as unknown as Stripe.Subscription;

  await prisma.moduleChangeRequest.updateMany({
    where: {
      id: { in: due.map((request) => request.id) },
    },
    data: {
      status: ModuleChangeRequestStatus.APPLIED,
      appliedAt: new Date(),
      errorMessage: null,
    },
  });

  return updated;
}
