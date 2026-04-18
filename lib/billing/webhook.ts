import type Stripe from "stripe";
import { applyDueModuleChangesForBusiness } from "@/lib/billing/subscriptions";
import { syncBusinessProjectionFromStripeSubscription } from "@/lib/billing/projection";
import { prisma } from "@/lib/prisma";

async function findBusinessIdForSubscription(subscription: Stripe.Subscription) {
  const metadataBusinessId = subscription.metadata?.businessId?.trim();

  if (metadataBusinessId) {
    return metadataBusinessId;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer && "id" in subscription.customer
        ? subscription.customer.id
        : null;

  if (customerId) {
    const business = await prisma.business.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (business) {
      return business.id;
    }
  }

  const businessBySubscription = await prisma.business.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });

  return businessBySubscription?.id ?? null;
}

async function attachStripeCustomerAndSubscriptionToBusiness(input: {
  businessId: string;
  customerId: string | null;
  subscriptionId: string | null;
}) {
  await prisma.business.update({
    where: { id: input.businessId },
    data: {
      stripeCustomerId: input.customerId ?? undefined,
      stripeSubscriptionId: input.subscriptionId ?? undefined,
      billingSyncedAt: new Date(),
    },
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const businessId =
    (typeof session.metadata?.businessId === "string" ? session.metadata.businessId.trim() : "") ||
    (typeof session.client_reference_id === "string" ? session.client_reference_id.trim() : "");

  if (!businessId) {
    return;
  }

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  await attachStripeCustomerAndSubscriptionToBusiness({
    businessId,
    customerId,
    subscriptionId,
  });
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const businessId = await findBusinessIdForSubscription(subscription);

  if (!businessId) {
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer && "id" in subscription.customer
        ? subscription.customer.id
        : null;

  await attachStripeCustomerAndSubscriptionToBusiness({
    businessId,
    customerId,
    subscriptionId: subscription.id,
  });

  const normalizedSubscription = await applyDueModuleChangesForBusiness({
    businessId,
    subscription,
  });

  await syncBusinessProjectionFromStripeSubscription({
    businessId,
    subscription: normalizedSubscription,
  });
}

export async function processStripeWebhookEvent(event: Stripe.Event) {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: {
      stripeEventId: event.id,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return { duplicate: true };
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
  }

  const eventBusinessId =
    (event.type.startsWith("customer.subscription")
      ? await findBusinessIdForSubscription(event.data.object as Stripe.Subscription)
      : null) ?? null;

  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      eventType: event.type,
      businessId: eventBusinessId,
    },
  });

  return { duplicate: false };
}
