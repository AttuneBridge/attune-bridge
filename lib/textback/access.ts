import { AppModule } from "@prisma/client";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";

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
  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return { ok: false, status: access.status, error: access.error };
  }

  const subscription = await getModuleSubscriptionForBusiness(businessId, AppModule.MISSED_CALL_TEXTBACK);

  if (!subscription.isEnabled) {
    return { ok: false, status: 403, error: "Missed Call Text Back module is not active." };
  }

  return { ok: true };
}
