import { NextResponse } from "next/server";

function readUrlParts(rawValue: string | undefined) {
  if (!rawValue || !rawValue.trim()) {
    return {
      present: false,
      host: null,
      port: null,
      protocol: null,
      parseError: null,
    };
  }

  try {
    const parsed = new URL(rawValue);
    return {
      present: true,
      host: parsed.hostname,
      port: parsed.port || null,
      protocol: parsed.protocol,
      hasPgbouncerParam: parsed.searchParams.get("pgbouncer") === "true",
      hasConnectionLimitParam: parsed.searchParams.has("connection_limit"),
      parseError: null,
    };
  } catch {
    return {
      present: true,
      host: null,
      port: null,
      protocol: null,
      hasPgbouncerParam: false,
      hasConnectionLimitParam: false,
      parseError: "INVALID_URL",
    };
  }
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const requestUrl = new URL(request.url);
  const provided = requestUrl.searchParams.get("key")?.trim() ?? "";

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    authMode: process.env.AUTH_MODE ?? null,
    demoModeEnabled: process.env.DEMO_MODE_ENABLED ?? null,
    nextPublicDemoHost: process.env.NEXT_PUBLIC_DEMO_HOST ?? null,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    databaseUrl: readUrlParts(process.env.DATABASE_URL),
    directUrl: readUrlParts(process.env.DIRECT_URL),
  });
}
