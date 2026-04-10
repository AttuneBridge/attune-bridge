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

  const fallbackBusiness =
    !membership && (identity.systemRole === "SUPER_ADMIN" || identity.systemRole === "ADMIN")
      ? await prisma.business.findFirst({
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
          orderBy: {
            createdAt: "asc",
          },
        })
      : null;

  const business = membership?.business ?? fallbackBusiness;
  const location = business?.locations[0];

  if (!business || !location) {
    redirectToDashboardAccess("/dashboard");
  }

  return {
    businessId: business.id,
    businessName: business.name,
    locationName: location.name,
    locationSlug: location.slug,
  };
}
