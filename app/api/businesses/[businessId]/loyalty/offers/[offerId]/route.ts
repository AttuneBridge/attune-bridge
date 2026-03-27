import { LoyaltyOfferKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { prisma } from "@/lib/prisma";

type UpdateOfferRequestBody = {
  name?: unknown;
  kind?: unknown;
  valueText?: unknown;
  validDays?: unknown;
  code?: unknown;
  maxRedemptions?: unknown;
  isActive?: unknown;
  manageToken?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string; offerId: string }> },
) {
  const { businessId, offerId } = await context.params;
  let body: UpdateOfferRequestBody;

  try {
    body = (await request.json()) as UpdateOfferRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getLoyaltyAccessResult(
    businessId,
    typeof body.manageToken === "string" ? body.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const existing = await prisma.loyaltyOffer.findFirst({
    where: { id: offerId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const valueText = typeof body.valueText === "string" ? body.valueText.trim() : undefined;
  const code = typeof body.code === "string" ? body.code.trim() : undefined;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
  const validDaysRaw = typeof body.validDays === "number" ? body.validDays : Number(body.validDays);
  const validDays = Number.isFinite(validDaysRaw) ? Math.floor(validDaysRaw) : undefined;
  const maxRedemptionsRaw =
    typeof body.maxRedemptions === "number" ? body.maxRedemptions : Number(body.maxRedemptions);
  const maxRedemptions = Number.isFinite(maxRedemptionsRaw) ? Math.floor(maxRedemptionsRaw) : undefined;

  if (name !== undefined && (!name || name.length > 80)) {
    return NextResponse.json({ error: "Offer name must be between 1 and 80 characters." }, { status: 400 });
  }

  if (body.kind !== undefined && !(typeof body.kind === "string" && body.kind in LoyaltyOfferKind)) {
    return NextResponse.json({ error: "Invalid offer kind." }, { status: 400 });
  }

  if (valueText !== undefined && (!valueText || valueText.length > 160)) {
    return NextResponse.json(
      { error: "Offer details must be between 1 and 160 characters." },
      { status: 400 },
    );
  }

  if (validDays !== undefined && (validDays < 1 || validDays > 365)) {
    return NextResponse.json({ error: "Valid days must be between 1 and 365." }, { status: 400 });
  }

  if (code !== undefined && code.length > 40) {
    return NextResponse.json({ error: "Offer code must be 40 characters or fewer." }, { status: 400 });
  }

  if (maxRedemptions !== undefined && (maxRedemptions < 1 || maxRedemptions > 100000)) {
    return NextResponse.json(
      { error: "Max redemptions must be between 1 and 100000." },
      { status: 400 },
    );
  }

  const offer = await prisma.loyaltyOffer.update({
    where: { id: offerId },
    data: {
      ...(name === undefined ? {} : { name }),
      ...(body.kind === undefined ? {} : { kind: LoyaltyOfferKind[body.kind as keyof typeof LoyaltyOfferKind] }),
      ...(valueText === undefined ? {} : { valueText }),
      ...(validDays === undefined ? {} : { validDays }),
      ...(code === undefined ? {} : { code: code || null }),
      ...(maxRedemptions === undefined ? {} : { maxRedemptions }),
      ...(isActive === undefined ? {} : { isActive }),
    },
  });

  return NextResponse.json({ ok: true, offer });
}
