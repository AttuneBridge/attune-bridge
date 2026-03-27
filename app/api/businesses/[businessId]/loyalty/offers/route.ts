import { LoyaltyOfferKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type CreateOfferRequestBody = {
  name?: unknown;
  kind?: unknown;
  valueText?: unknown;
  validDays?: unknown;
  code?: unknown;
  maxRedemptions?: unknown;
  isActive?: unknown;
  manageToken?: unknown;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(request.url);
  const manageToken = searchParams.get("token")?.trim();

  const access = await getLoyaltyAccessResult(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const items = await prisma.loyaltyOffer.findMany({
    where: { businessId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: CreateOfferRequestBody;

  try {
    body = (await request.json()) as CreateOfferRequestBody;
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const valueText = typeof body.valueText === "string" ? body.valueText.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
  const validDaysRaw = typeof body.validDays === "number" ? body.validDays : Number(body.validDays);
  const validDays = Number.isFinite(validDaysRaw) ? Math.floor(validDaysRaw) : NaN;
  const maxRedemptionsRaw =
    typeof body.maxRedemptions === "number" ? body.maxRedemptions : Number(body.maxRedemptions);
  const hasMaxRedemptions = Number.isFinite(maxRedemptionsRaw);

  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: "Offer name is required and must be 80 characters or fewer." },
      { status: 400 },
    );
  }

  if (!(typeof body.kind === "string" && body.kind in LoyaltyOfferKind)) {
    return NextResponse.json({ error: "Invalid offer kind." }, { status: 400 });
  }

  if (!valueText || valueText.length > 160) {
    return NextResponse.json(
      { error: "Offer details are required and must be 160 characters or fewer." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(validDays) || validDays < 1 || validDays > 365) {
    return NextResponse.json({ error: "Valid days must be between 1 and 365." }, { status: 400 });
  }

  if (code.length > 40) {
    return NextResponse.json({ error: "Offer code must be 40 characters or fewer." }, { status: 400 });
  }

  if (hasMaxRedemptions && (maxRedemptionsRaw < 1 || maxRedemptionsRaw > 100000)) {
    return NextResponse.json(
      { error: "Max redemptions must be between 1 and 100000." },
      { status: 400 },
    );
  }

  const offer = await prisma.loyaltyOffer.create({
    data: {
      businessId,
      name,
      kind: LoyaltyOfferKind[body.kind as keyof typeof LoyaltyOfferKind],
      valueText,
      validDays,
      code: code || null,
      maxRedemptions: hasMaxRedemptions ? Math.floor(maxRedemptionsRaw) : null,
      isActive,
    },
  });

  await trackValidationEvent({
    event: validationEvent.loyaltyOfferCreated,
    businessId,
    metadata: {
      offerId: offer.id,
      kind: offer.kind,
    },
  });

  return NextResponse.json({ ok: true, offer }, { status: 201 });
}
