import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SafeUserSummary = {
  id: string;
  email: string;
  clerkUserId: string | null;
  systemRole: string;
};

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const requestUrl = new URL(request.url);
  const provided = requestUrl.searchParams.get("key")?.trim() ?? "";

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clerkUserId = requestUrl.searchParams.get("clerkUserId")?.trim() ?? "";

  if (!clerkUserId) {
    return NextResponse.json({ error: "Missing clerkUserId query param." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      email: true,
      clerkUserId: true,
      systemRole: true,
    },
  });

  const ownerMembershipCount = user
    ? await prisma.businessMembership.count({
        where: {
          userId: user.id,
          role: "OWNER",
        },
      })
    : 0;

  const firstBusiness = await prisma.business.findFirst({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const safeUser: SafeUserSummary | null = user
    ? {
        id: user.id,
        email: user.email,
        clerkUserId: user.clerkUserId,
        systemRole: user.systemRole,
      }
    : null;

  return NextResponse.json({
    clerkUserId,
    foundUser: safeUser,
    ownerMembershipCount,
    hasAnyBusiness: Boolean(firstBusiness),
    firstBusinessId: firstBusiness?.id ?? null,
  });
}
