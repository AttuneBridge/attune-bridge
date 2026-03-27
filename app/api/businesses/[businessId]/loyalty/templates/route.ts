import { LoyaltyTemplateCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type CreateTemplateRequestBody = {
  name?: unknown;
  category?: unknown;
  subject?: unknown;
  previewText?: unknown;
  body?: unknown;
  ctaLabel?: unknown;
  isDefault?: unknown;
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

  const items = await prisma.loyaltyTemplate.findMany({
    where: { businessId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let bodyPayload: CreateTemplateRequestBody;

  try {
    bodyPayload = (await request.json()) as CreateTemplateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getLoyaltyAccessResult(
    businessId,
    typeof bodyPayload.manageToken === "string" ? bodyPayload.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const name = typeof bodyPayload.name === "string" ? bodyPayload.name.trim() : "";
  const subject = typeof bodyPayload.subject === "string" ? bodyPayload.subject.trim() : "";
  const previewText =
    typeof bodyPayload.previewText === "string" ? bodyPayload.previewText.trim() : "";
  const body = typeof bodyPayload.body === "string" ? bodyPayload.body.trim() : "";
  const ctaLabel = typeof bodyPayload.ctaLabel === "string" ? bodyPayload.ctaLabel.trim() : "";
  const isDefault = typeof bodyPayload.isDefault === "boolean" ? bodyPayload.isDefault : false;

  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: "Template name is required and must be 80 characters or fewer." },
      { status: 400 },
    );
  }

  if (!(typeof bodyPayload.category === "string" && bodyPayload.category in LoyaltyTemplateCategory)) {
    return NextResponse.json({ error: "Invalid template category." }, { status: 400 });
  }

  if (!subject || subject.length > 160) {
    return NextResponse.json(
      { error: "Subject is required and must be 160 characters or fewer." },
      { status: 400 },
    );
  }

  if (previewText.length > 200) {
    return NextResponse.json(
      { error: "Preview text must be 200 characters or fewer." },
      { status: 400 },
    );
  }

  if (!body || body.length > 5000) {
    return NextResponse.json(
      { error: "Body is required and must be 5000 characters or fewer." },
      { status: 400 },
    );
  }

  if (!ctaLabel || ctaLabel.length > 60) {
    return NextResponse.json(
      { error: "CTA label is required and must be 60 characters or fewer." },
      { status: 400 },
    );
  }

  if (isDefault) {
    await prisma.loyaltyTemplate.updateMany({
      where: {
        businessId,
        category: LoyaltyTemplateCategory[bodyPayload.category as keyof typeof LoyaltyTemplateCategory],
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const template = await prisma.loyaltyTemplate.create({
    data: {
      businessId,
      name,
      category: LoyaltyTemplateCategory[bodyPayload.category as keyof typeof LoyaltyTemplateCategory],
      subject,
      previewText: previewText || null,
      body,
      ctaLabel,
      isDefault,
    },
  });

  await trackValidationEvent({
    event: validationEvent.loyaltyTemplateCreated,
    businessId,
    metadata: {
      templateId: template.id,
      category: template.category,
      isDefault: template.isDefault,
    },
  });

  return NextResponse.json({ ok: true, template }, { status: 201 });
}
