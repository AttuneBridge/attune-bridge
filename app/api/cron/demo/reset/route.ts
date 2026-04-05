import { NextResponse } from "next/server";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { prisma } from "@/lib/prisma";
import { seedDemoData } from "@/prisma/seed";

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
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isDemoModeEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "demo_mode_disabled" });
  }

  await seedDemoData(prisma);

  return NextResponse.json({
    ok: true,
    resetAt: new Date().toISOString(),
  });
}
