import { LoyaltyTemplateCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { prisma } from "@/lib/prisma";

type UpdateTemplateRequestBody = {
  name?: unknown;
  category?: unknown;
  subject?: unknown;
  previewText?: unknown;
  body?: unknown;
  ctaLabel?: unknown;
  isDefault?: unknown;
  manageToken?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string; templateId: string }> },
) {
  const { businessId, templateId } = await context.params;
  let bodyPayload: UpdateTemplateRequestBody;

  try {
    bodyPayload = (await request.json()) as UpdateTemplateRequestBody;
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

  const existing = await prisma.loyaltyTemplate.findFirst({
    where: { id: templateId, businessId },
    select: { id: true, category: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const name = typeof bodyPayload.name === "string" ? bodyPayload.name.trim() : undefined;
  const subject = typeof bodyPayload.subject === "string" ? bodyPayload.subject.trim() : undefined;
  const previewText =
    typeof bodyPayload.previewText === "string" ? bodyPayload.previewText.trim() : undefined;
  const body = typeof bodyPayload.body === "string" ? bodyPayload.body.trim() : undefined;
  const ctaLabel = typeof bodyPayload.ctaLabel === "string" ? bodyPayload.ctaLabel.trim() : undefined;
  const isDefault = typeof bodyPayload.isDefault === "boolean" ? bodyPayload.isDefault : undefined;

  if (name !== undefined && (!name || name.length > 80)) {
    return NextResponse.json(
      { error: "Template name must be between 1 and 80 characters." },
      { status: 400 },
    );
  }

  if (bodyPayload.category !== undefined && !(typeof bodyPayload.category === "string" && bodyPayload.category in LoyaltyTemplateCategory)) {
    return NextResponse.json({ error: "Invalid template category." }, { status: 400 });
  }

  if (subject !== undefined && (!subject || subject.length > 160)) {
    return NextResponse.json(
      { error: "Subject must be between 1 and 160 characters." },
      { status: 400 },
    );
  }

  if (previewText !== undefined && previewText.length > 200) {
    return NextResponse.json(
      { error: "Preview text must be 200 characters or fewer." },
      { status: 400 },
    );
  }

  if (body !== undefined && (!body || body.length > 5000)) {
    return NextResponse.json(
      { error: "Body must be between 1 and 5000 characters." },
      { status: 400 },
    );
  }

  if (ctaLabel !== undefined && (!ctaLabel || ctaLabel.length > 60)) {
    return NextResponse.json(
      { error: "CTA label must be between 1 and 60 characters." },
      { status: 400 },
    );
  }

  const nextCategory =
    typeof bodyPayload.category === "string"
      ? LoyaltyTemplateCategory[bodyPayload.category as keyof typeof LoyaltyTemplateCategory]
      : existing.category;

  if (isDefault === true) {
    await prisma.loyaltyTemplate.updateMany({
      where: {
        businessId,
        category: nextCategory,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const template = await prisma.loyaltyTemplate.update({
    where: { id: templateId },
    data: {
      ...(name === undefined ? {} : { name }),
      ...(bodyPayload.category === undefined
        ? {}
        : { category: LoyaltyTemplateCategory[bodyPayload.category as keyof typeof LoyaltyTemplateCategory] }),
      ...(subject === undefined ? {} : { subject }),
      ...(previewText === undefined ? {} : { previewText: previewText || null }),
      ...(body === undefined ? {} : { body }),
      ...(ctaLabel === undefined ? {} : { ctaLabel }),
      ...(isDefault === undefined ? {} : { isDefault }),
    },
  });

  return NextResponse.json({ ok: true, template });
}
