import { LoyaltyConversionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { captureConversionAndGetRedirect } from "@/lib/loyalty/conversion";

export async function GET(
  _request: Request,
  context: { params: Promise<{ trackingToken: string }> },
) {
  const { trackingToken } = await context.params;
  const result = await captureConversionAndGetRedirect({
    trackingToken,
    type: LoyaltyConversionType.REVIEW,
  });

  return NextResponse.redirect(result.redirectUrl, { status: 302 });
}
