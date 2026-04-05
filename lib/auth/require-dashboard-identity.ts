import "server-only";

import { allowsLegacyOwnerSession } from "@/lib/auth/mode";
import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { getRequestIdentity, type RequestIdentity } from "@/lib/identity/request-identity";
import { getOwnerSession } from "@/lib/owner-session";

type OwnerSession = NonNullable<Awaited<ReturnType<typeof getOwnerSession>>>;

export type DashboardAuthContext =
  | {
      source: "clerk";
      identity: RequestIdentity;
    }
  | {
      source: "legacy";
      ownerSession: OwnerSession;
    };

export async function requireDashboardIdentity(pathname: string): Promise<DashboardAuthContext> {
  const identity = await getRequestIdentity();

  if (identity) {
    return {
      source: "clerk",
      identity,
    };
  }

  if (allowsLegacyOwnerSession()) {
    const ownerSession = await getOwnerSession();

    if (ownerSession) {
      return {
        source: "legacy",
        ownerSession,
      };
    }
  }

  redirectToDashboardAccess(pathname);
}
