import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { createSubscriptionCheckoutSession } from "@/lib/billing/subscriptions";

type CheckoutRequestBody = {
  businessId?: unknown;
  manageToken?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CheckoutRequestBody | null;
  const businessId = body && typeof body.businessId === "string" ? body.businessId.trim() : "";
  const manageToken = body && typeof body.manageToken === "string" ? body.manageToken.trim() : "";

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const result = await createSubscriptionCheckoutSession({ businessId });

    if (!result.checkoutUrl) {
      return NextResponse.json({ ok: true, alreadyActive: true });
    }

    return NextResponse.json({ ok: true, checkoutUrl: result.checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
