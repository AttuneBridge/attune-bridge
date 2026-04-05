import { BusinessMembershipRole } from "@prisma/client";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { requireDashboardIdentity } from "@/lib/auth/require-dashboard-identity";
import { prisma } from "@/lib/prisma";

export async function getOwnerWorkspaceContextOrRedirect() {
  const identity = await requireDashboardIdentity("/dashboard");

  const membership = await prisma.businessMembership.findFirst({
    where: {
      userId: identity.userId,
      role: BusinessMembershipRole.OWNER,
    },
    select: {
      business: {
        select: {
          id: true,
          name: true,
          locations: {
            select: {
              slug: true,
              name: true,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const location = membership?.business.locations[0];

  if (!membership || !location) {
    redirectToDashboardAccess("/dashboard");
  }

  return {
    businessId: membership.business.id,
    businessName: membership.business.name,
    locationName: location.name,
    locationSlug: location.slug,
  };
}
