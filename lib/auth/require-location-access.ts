import "server-only";

import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { hasBusinessOwnerAccess } from "@/lib/auth/require-business-owner-access";
import { prisma } from "@/lib/prisma";

export async function requireLocationAccess(input: { locationId: string; pathname: string }) {
  const location = await prisma.location.findUnique({
    where: { id: input.locationId },
    select: {
      businessId: true,
    },
  });

  if (!location) {
    redirectToDashboardAccess(input.pathname);
  }

  const hasAccess = await hasBusinessOwnerAccess(location.businessId);

  if (!hasAccess) {
    redirectToDashboardAccess(input.pathname);
  }

  return {
    businessId: location.businessId,
  };
}
