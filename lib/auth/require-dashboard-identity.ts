import "server-only";

import { redirectToDashboardAccess } from "@/lib/auth/redirects";
import { getRequestIdentity, type RequestIdentity } from "@/lib/identity/request-identity";

export async function requireDashboardIdentity(pathname: string): Promise<RequestIdentity> {
  const identity = await getRequestIdentity();

  if (identity) {
    return identity;
  }

  redirectToDashboardAccess(pathname);
}
