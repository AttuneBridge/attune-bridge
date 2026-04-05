import "server-only";

import { auth } from "@clerk/nextjs/server";
import { SystemRole } from "@prisma/client";
import { allowsClerkAuth } from "@/lib/auth/mode";
import { prisma } from "@/lib/prisma";

export type RequestIdentity = {
  userId: string;
  clerkUserId: string;
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

export async function getRequestIdentity(): Promise<RequestIdentity | null> {
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
