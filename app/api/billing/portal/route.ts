import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { createBillingPortalSession } from "@/lib/billing/subscriptions";

type PortalRequestBody = {
  businessId?: unknown;
  manageToken?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PortalRequestBody | null;
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
    const result = await createBillingPortalSession({ businessId });
    return NextResponse.json({ ok: true, portalUrl: result.portalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create billing portal session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
