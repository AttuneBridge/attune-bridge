import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { allowsClerkAuth } from "@/lib/auth/mode";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { prisma } from "@/lib/prisma";

function hasClerkServerConfig() {
  return (
    typeof process.env.CLERK_SECRET_KEY === "string" &&
    process.env.CLERK_SECRET_KEY.length > 0 &&
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0
  );
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const requestUrl = new URL(request.url);
  const provided = requestUrl.searchParams.get("key")?.trim() ?? "";

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authState = await auth();
  const sessionEmail =
    typeof authState.sessionClaims?.email === "string" ? authState.sessionClaims.email.trim().toLowerCase() : null;

  const userByClerkId = authState.userId
    ? await prisma.user.findUnique({
        where: { clerkUserId: authState.userId },
        select: {
          id: true,
          email: true,
          clerkUserId: true,
          systemRole: true,
        },
      })
    : null;

  const userBySessionEmail = sessionEmail
    ? await prisma.user.findUnique({
        where: { email: sessionEmail },
        select: {
          id: true,
          email: true,
          clerkUserId: true,
          systemRole: true,
        },
      })
    : null;

  const requestIdentity = await getRequestIdentity();

  return NextResponse.json({
    authMode: process.env.AUTH_MODE ?? null,
    allowsClerkAuth: allowsClerkAuth(),
    hasClerkServerConfig: hasClerkServerConfig(),
    authUserId: authState.userId ?? null,
    sessionEmail,
    userByClerkId,
    userBySessionEmail,
    requestIdentity,
  });
}
