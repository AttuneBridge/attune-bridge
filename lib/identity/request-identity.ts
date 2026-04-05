import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { BusinessMembershipRole, SystemRole } from "@prisma/client";
import { allowsClerkAuth } from "@/lib/auth/mode";
import { DEMO_OWNER_EMAIL, isDemoModeAllowedForHost } from "@/lib/demo/config";
import { DEMO_SESSION_COOKIE_NAME, verifyDemoSessionToken } from "@/lib/demo/session";
import { prisma } from "@/lib/prisma";

export type RequestIdentity = {
  userId: string;
  clerkUserId: string | null;
  email: string;
  systemRole: SystemRole;
};

function hasClerkServerConfig() {
  return (
    typeof process.env.CLERK_SECRET_KEY === "string" &&
    process.env.CLERK_SECRET_KEY.length > 0 &&
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0
  );
}

async function getDemoRequestIdentity(): Promise<RequestIdentity | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");

  if (!isDemoModeAllowedForHost(host)) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(DEMO_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const claims = verifyDemoSessionToken(sessionCookie);

  if (!claims) {
    return null;
  }

  const membership = await prisma.businessMembership.findFirst({
    where: {
      businessId: claims.businessId,
      role: BusinessMembershipRole.OWNER,
      user: {
        email: DEMO_OWNER_EMAIL,
      },
      business: {
        email: DEMO_OWNER_EMAIL,
      },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          systemRole: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    return null;
  }

  return {
    userId: membership.user.id,
    clerkUserId: null,
    email: membership.user.email,
    systemRole: membership.user.systemRole,
  };
}

export async function getRequestIdentity(): Promise<RequestIdentity | null> {
  const demoIdentity = await getDemoRequestIdentity();

  if (demoIdentity) {
    return demoIdentity;
  }

  if (!allowsClerkAuth() || !hasClerkServerConfig()) {
    return null;
  }

  const authState = await auth();

  if (!authState.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: authState.userId },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      systemRole: true,
    },
  });

  if (!user || !user.clerkUserId) {
    return null;
  }

  return {
    userId: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    systemRole: user.systemRole,
  };
}
