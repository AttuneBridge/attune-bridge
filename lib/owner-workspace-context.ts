import { BusinessMembershipRole } from "@prisma/client";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { requireDashboardIdentity } from "@/lib/auth/require-dashboard-identity";
import { prisma } from "@/lib/prisma";

export async function getOwnerWorkspaceContextOrRedirect() {
  const authContext = await requireDashboardIdentity("/dashboard");

  if (authContext.source === "legacy") {
    const location = await prisma.location.findUnique({
      where: { slug: authContext.ownerSession.locationSlug },
      select: {
        slug: true,
        name: true,
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!location || location.business.id !== authContext.ownerSession.businessId) {
      redirectToDashboardAccess("/dashboard");
    }

    return {
      businessId: location.business.id,
      businessName: location.business.name,
      locationName: location.name,
      locationSlug: location.slug,
    };
  }

  const membership = await prisma.businessMembership.findFirst({
    where: {
      userId: authContext.identity.userId,
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
