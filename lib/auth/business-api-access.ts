import { isManageTokenValidForBusiness } from "@/lib/manage-token";
import { hasBusinessOwnerAccess } from "@/lib/auth/require-business-owner-access";

type BusinessApiAccessResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function getBusinessApiAccessResult(
  businessId: string,
  manageToken?: string,
): Promise<BusinessApiAccessResult> {
  const hasOwnerAccess = await hasBusinessOwnerAccess(businessId);

  if (hasOwnerAccess) {
    return { ok: true };
  }

  const hasValidManageToken =
    typeof manageToken === "string" &&
    manageToken.trim().length > 0 &&
    isManageTokenValidForBusiness(manageToken.trim(), businessId);

  if (hasValidManageToken) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 401,
    error: "Unauthorized.",
  };
}
