import { AppModule } from "@prisma/client";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";

type LoyaltyAccessResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function getLoyaltyAccessResult(businessId: string, manageToken?: string): Promise<LoyaltyAccessResult> {
  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return { ok: false, status: access.status, error: access.error };
  }

  const subscription = await getModuleSubscriptionForBusiness(businessId, AppModule.LOYALTY);

  if (!subscription.isEnabled) {
    return { ok: false, status: 403, error: "Loyalty module is not active." };
  }

  return { ok: true };
}
