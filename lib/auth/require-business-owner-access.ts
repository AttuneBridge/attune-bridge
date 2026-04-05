import "server-only";

import { BusinessMembershipRole } from "@prisma/client";
import { allowsLegacyOwnerSession } from "@/lib/auth/mode";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { getRequestIdentity } from "@/lib/identity/request-identity";
import { getOwnerSession } from "@/lib/owner-session";
import { prisma } from "@/lib/prisma";

export async function hasBusinessOwnerAccess(businessId: string) {
  const identity = await getRequestIdentity();

  if (identity) {
    const membership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: identity.userId,
          businessId,
        },
      },
      select: {
        role: true,
      },
    });

    return membership?.role === BusinessMembershipRole.OWNER;
  }

  if (!allowsLegacyOwnerSession()) {
    return false;
  }

  const ownerSession = await getOwnerSession();

  if (!ownerSession) {
    return false;
  }

  return ownerSession.businessId === businessId;
}

export async function requireBusinessOwnerAccess(input: { businessId: string; pathname: string }) {
  const hasAccess = await hasBusinessOwnerAccess(input.businessId);

  if (!hasAccess) {
    redirectToDashboardAccess(input.pathname);
  }
}
