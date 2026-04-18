import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import {
  cancelSubscriptionAtPeriodEnd,
  createSubscriptionCheckoutSession,
  resumeSubscriptionRenewal,
} from "@/lib/billing/subscriptions";
import { getSubscriptionCurrentPeriodEnd } from "@/lib/billing/stripe-subscription-utils";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

function getCurrentPeriodEndDate(subscription: Stripe.Subscription) {
  const periodEnd = getSubscriptionCurrentPeriodEnd(subscription);
  return periodEnd ? new Date(periodEnd * 1000) : null;
}

const cancelReasonLabels = new Set([
  "TOO_EXPENSIVE",
  "LOW_USAGE",
  "MISSING_FEATURES",
  "SWITCHING_TOOL",
  "OTHER",
]);

type RenewBody = {
  action?: unknown;
  manageToken?: unknown;
  cancelReason?: unknown;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const body = (await request.json().catch(() => null)) as RenewBody | null;
  const action = body && typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  const manageToken = body && typeof body.manageToken === "string" ? body.manageToken.trim() : "";
  const cancelReasonRaw =
    body && typeof body.cancelReason === "string" ? body.cancelReason.trim().toUpperCase() : "";

  if (action !== "start" && action !== "cancel" && action !== "winback") {
    return NextResponse.json({ error: "action must be start, cancel, or winback." }, { status: 400 });
  }

  if ((action === "cancel" || action === "winback") && cancelReasonRaw && !cancelReasonLabels.has(cancelReasonRaw)) {
    return NextResponse.json({ error: "Invalid cancel reason." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      stripeStatus: true,
      stripeCurrentPeriodEnd: true,
      stripeCancelAtPeriodEnd: true,
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const access = await getBusinessApiAccessResult(business.id, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    if (action === "start") {
      if (business.stripeCancelAtPeriodEnd) {
        const subscription = await resumeSubscriptionRenewal(business.id);

        await trackValidationEvent({
          event: validationEvent.subscriptionWinbackAccepted,
          businessId: business.id,
          metadata: {
            action,
            via: "resume_renewal",
            stripeStatus: subscription.status,
          },
        });

        return NextResponse.json({
          ok: true,
          action,
          resumed: true,
          stripeStatus: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: getCurrentPeriodEndDate(subscription),
        });
      }

      const result = await createSubscriptionCheckoutSession({
        businessId: business.id,
        successPath: "/dashboard/settings",
        cancelPath: "/dashboard/settings",
      });

      await trackValidationEvent({
        event: validationEvent.subscriptionStarted,
        businessId: business.id,
        metadata: {
          action,
          checkoutCreated: Boolean(result.checkoutUrl),
        },
      });

      return NextResponse.json({
        ok: true,
        action,
        checkoutUrl: result.checkoutUrl,
        alreadyActive: !result.checkoutUrl,
      });
    }

    if (action === "cancel") {
      const subscription = await cancelSubscriptionAtPeriodEnd(business.id);

      await trackValidationEvent({
        event: validationEvent.subscriptionCanceled,
        businessId: business.id,
        metadata: {
          action,
          cancelReason: cancelReasonRaw || null,
          stripeStatus: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      if (cancelReasonRaw) {
        await trackValidationEvent({
          event: validationEvent.subscriptionCancelReasonCaptured,
          businessId: business.id,
          metadata: {
            cancelReason: cancelReasonRaw,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        action,
        stripeStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: getCurrentPeriodEndDate(subscription),
      });
    }

    const subscription = await resumeSubscriptionRenewal(business.id);

    await trackValidationEvent({
      event: validationEvent.subscriptionWinbackAccepted,
      businessId: business.id,
      metadata: {
        action,
        cancelReason: cancelReasonRaw || null,
        stripeStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    return NextResponse.json({
      ok: true,
      action,
      stripeStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: getCurrentPeriodEndDate(subscription),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing action failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
