import { AppModule } from "@prisma/client";
import { cookies } from "next/headers";
import { isManageTokenValidForBusiness } from "@/lib/manage-token";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { OWNER_SESSION_COOKIE_NAME, isOwnerSessionValidForBusiness } from "@/lib/owner-session";

type TextBackAccessResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function getTextBackAccessResult(
  businessId: string,
  manageToken?: string,
): Promise<TextBackAccessResult> {
  const cookieStore = await cookies();
  const ownerSessionToken = cookieStore.get(OWNER_SESSION_COOKIE_NAME)?.value ?? "";
  const hasValidOwnerSession = isOwnerSessionValidForBusiness(ownerSessionToken, { businessId });
  const hasValidManageToken =
    typeof manageToken === "string" &&
    manageToken.trim().length > 0 &&
    isManageTokenValidForBusiness(manageToken.trim(), businessId);

  if (!hasValidOwnerSession && !hasValidManageToken) {
    return { ok: false, status: 401, error: "Manage token is invalid or expired." };
  }

  const subscription = await getModuleSubscriptionForBusiness(businessId, AppModule.MISSED_CALL_TEXTBACK);

  if (!subscription.isEnabled) {
    return { ok: false, status: 403, error: "Missed Call Text Back module is not active." };
  }

  return { ok: true };
}
