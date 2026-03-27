import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { processLoyaltyMessagesForBusiness } from "@/lib/loyalty/process";

type ProcessMessagesRequestBody = {
  limit?: unknown;
  manageToken?: unknown;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: ProcessMessagesRequestBody;

  try {
    body = (await request.json()) as ProcessMessagesRequestBody;
  } catch {
    body = {};
  }

  const access = await getLoyaltyAccessResult(
    businessId,
    typeof body.manageToken === "string" ? body.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const limitRaw = typeof body.limit === "number" ? body.limit : Number(body.limit);
  const take = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 100) : 25;

  const result = await processLoyaltyMessagesForBusiness({
    businessId,
    limit: take,
    source: "manual",
  });

  if (result.notFound) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    attempted: result.attempted,
    sentCount: result.sentCount,
    failedCount: result.failedCount,
    skippedCount: result.skippedCount,
  });
}
