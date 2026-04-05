import { BusinessMembershipRole } from "@prisma/client";
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

export async function POST(request: Request) {
  const host = request.headers.get("host");

  if (!isDemoModeAllowedForHost(host)) {
    return NextResponse.json({ error: "Demo access is unavailable on this host." }, { status: 403 });
  }

  const formData = await request.formData();
  const returnTo = sanitizeReturnTo(
    typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
  );

  const membership = await prisma.businessMembership.findFirst({
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

  if (!membership) {
    return NextResponse.json(
      { error: "Demo data is not ready yet. Run prisma seed." },
      { status: 503 },
    );
  }

  const expiresAt = new Date(Date.now() + DEMO_SESSION_TTL_SECONDS * 1000);
  const token = createDemoSessionToken({ businessId: membership.businessId, expiresAt });

  if (!token) {
    return NextResponse.json({ error: "Demo session secret is missing." }, { status: 503 });
  }

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
}
