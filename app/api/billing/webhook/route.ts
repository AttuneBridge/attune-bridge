import { NextResponse } from "next/server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/billing/client";
import { processStripeWebhookEvent } from "@/lib/billing/webhook";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
    const result = await processStripeWebhookEvent(event);
    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
