import { BusinessMembershipRole, SystemRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { DEMO_OWNER_EMAIL, isDemoModeAllowedForHost } from "@/lib/demo/config";
import { createDemoSessionToken, DEMO_SESSION_COOKIE_NAME } from "@/lib/demo/session";
import { prisma } from "@/lib/prisma";

const DEMO_SESSION_TTL_SECONDS = 24 * 60 * 60;

function sanitizeReturnTo(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return "/dashboard";
  }

  return trimmed;
}

async function readReturnToFromRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return "/dashboard";
  }

  try {
    const formData = await request.formData();
    return sanitizeReturnTo(
      typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
    );
  } catch {
    return "/dashboard";
  }
}

async function getDemoBusinessId() {
  const existingMembership = await prisma.businessMembership.findFirst({
    where: {
      role: BusinessMembershipRole.OWNER,
      user: {
        email: DEMO_OWNER_EMAIL,
      },
      business: {
        email: DEMO_OWNER_EMAIL,
      },
    },
    select: {
      businessId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingMembership) {
    return existingMembership.businessId;
  }

  const business = await prisma.business.findUnique({
    where: {
      email: DEMO_OWNER_EMAIL,
    },
    select: {
      id: true,
    },
  });

  if (!business) {
    return null;
  }

  const user = await prisma.user.upsert({
    where: {
      email: DEMO_OWNER_EMAIL,
    },
    update: {
      systemRole: SystemRole.USER,
    },
    create: {
      email: DEMO_OWNER_EMAIL,
      systemRole: SystemRole.USER,
    },
    select: {
      id: true,
    },
  });

  await prisma.businessMembership.upsert({
    where: {
      userId_businessId: {
        userId: user.id,
        businessId: business.id,
      },
    },
    update: {
      role: BusinessMembershipRole.OWNER,
    },
    create: {
      userId: user.id,
      businessId: business.id,
      role: BusinessMembershipRole.OWNER,
    },
  });

  return business.id;
}

function getDatabaseRuntimeHints() {
  const raw = process.env.DATABASE_URL;

  if (!raw || !raw.trim()) {
    return {
      hasDatabaseUrl: false,
      databaseHost: null,
      databasePort: null,
      hasPgbouncerParam: false,
      hasConnectionLimitParam: false,
    };
  }

  try {
    const parsed = new URL(raw);
    const hasPgbouncerParam = parsed.searchParams.get("pgbouncer") === "true";
    const hasConnectionLimitParam = parsed.searchParams.has("connection_limit");

    return {
      hasDatabaseUrl: true,
      databaseHost: parsed.hostname,
      databasePort: parsed.port || null,
      hasPgbouncerParam,
      hasConnectionLimitParam,
    };
  } catch {
    return {
      hasDatabaseUrl: true,
      databaseHost: null,
      databasePort: null,
      hasPgbouncerParam: false,
      hasConnectionLimitParam: false,
    };
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Submit the demo access form from /demo-access." },
    { status: 405 },
  );
}

export async function POST(request: Request) {
  const host = request.headers.get("host");

  if (!isDemoModeAllowedForHost(host)) {
    return NextResponse.json({ error: "Demo access is unavailable on this host." }, { status: 403 });
  }

  const returnTo = await readReturnToFromRequest(request);

  let demoBusinessId: string | null = null;

  try {
    demoBusinessId = await getDemoBusinessId();
  } catch (error) {
    const runtimeHints = getDatabaseRuntimeHints();
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Could not load demo business data.",
        code: "DEMO_DB_LOOKUP_FAILED",
        details: {
          message: errorMessage,
          ...runtimeHints,
        },
      },
      { status: 500 },
    );
  }

  if (!demoBusinessId) {
    return NextResponse.json(
      { error: "Demo business is not available yet. Run prisma seed." },
      { status: 503 },
    );
  }

  const expiresAt = new Date(Date.now() + DEMO_SESSION_TTL_SECONDS * 1000);
  const token = createDemoSessionToken({ businessId: demoBusinessId, expiresAt });

  if (!token) {
    return NextResponse.json({ error: "Demo session secret is missing.", code: "DEMO_SECRET_MISSING" }, { status: 503 });
  }

  try {
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set({
      name: DEMO_SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not create demo session response.", code: "DEMO_SESSION_RESPONSE_FAILED" },
      { status: 500 },
    );
  }
}
