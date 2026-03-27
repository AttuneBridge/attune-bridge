import { AppModule, ModuleSubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { processLoyaltyMessagesForBusiness } from "@/lib/loyalty/process";
import { prisma } from "@/lib/prisma";

type CronProcessRequestBody = {
  limitPerBusiness?: unknown;
};

function hasValidCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();

  if (!expected) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const xHeader = request.headers.get("x-cron-secret")?.trim() ?? "";

  return bearer === expected || xHeader === expected;
}

export async function POST(request: Request) {
  // Short term this can be triggered by Vercel Cron.
  // On EC2 migration, wire your instance cron to call this same endpoint.
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CronProcessRequestBody;

  try {
    body = (await request.json()) as CronProcessRequestBody;
  } catch {
    body = {};
  }

  const limitRaw =
    typeof body.limitPerBusiness === "number" ? body.limitPerBusiness : Number(body.limitPerBusiness);
  const limitPerBusiness = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 25;
  const now = new Date();

  const activeLoyaltySubscriptions = await prisma.businessModuleSubscription.findMany({
    where: {
      module: AppModule.LOYALTY,
      status: { in: [ModuleSubscriptionStatus.ACTIVE, ModuleSubscriptionStatus.TRIAL] },
      AND: [
        { OR: [{ startedAt: null }, { startedAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: {
      businessId: true,
    },
  });

  let businessesProcessed = 0;
  let attempted = 0;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const subscription of activeLoyaltySubscriptions) {
    const result = await processLoyaltyMessagesForBusiness({
      businessId: subscription.businessId,
      limit: limitPerBusiness,
      source: "cron",
    });

    if (result.notFound) {
      continue;
    }

    businessesProcessed += 1;
    attempted += result.attempted;
    sentCount += result.sentCount;
    failedCount += result.failedCount;
    skippedCount += result.skippedCount;
  }

  return NextResponse.json({
    ok: true,
    businessesProcessed,
    attempted,
    sentCount,
    failedCount,
    skippedCount,
  });
}
