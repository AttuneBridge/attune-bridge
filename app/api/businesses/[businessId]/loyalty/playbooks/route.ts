import {
  LoyaltyAudience,
  LoyaltyPlaybookStatus,
  LoyaltyPlaybookType,
  LoyaltyTrigger,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { prisma } from "@/lib/prisma";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type CreatePlaybookRequestBody = {
  name?: unknown;
  type?: unknown;
  audience?: unknown;
  trigger?: unknown;
  delayHours?: unknown;
  suppressIfBooked?: unknown;
  offerId?: unknown;
  templateId?: unknown;
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

  const items = await prisma.loyaltyPlaybook.findMany({
    where: { businessId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      offer: {
        select: {
          id: true,
          name: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: CreatePlaybookRequestBody;

  try {
    body = (await request.json()) as CreatePlaybookRequestBody;
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
  const delayHoursRaw = typeof body.delayHours === "number" ? body.delayHours : Number(body.delayHours);
  const delayHours = Number.isFinite(delayHoursRaw) ? Math.floor(delayHoursRaw) : NaN;
  const suppressIfBooked =
    typeof body.suppressIfBooked === "boolean" ? body.suppressIfBooked : true;
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";

  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: "Playbook name is required and must be 80 characters or fewer." },
      { status: 400 },
    );
  }

  if (!(typeof body.type === "string" && body.type in LoyaltyPlaybookType)) {
    return NextResponse.json({ error: "Invalid playbook type." }, { status: 400 });
  }

  if (!(typeof body.audience === "string" && body.audience in LoyaltyAudience)) {
    return NextResponse.json({ error: "Invalid audience value." }, { status: 400 });
  }

  if (!(typeof body.trigger === "string" && body.trigger in LoyaltyTrigger)) {
    return NextResponse.json({ error: "Invalid trigger value." }, { status: 400 });
  }

  if (!Number.isFinite(delayHours) || delayHours < 0 || delayHours > 24 * 30) {
    return NextResponse.json(
      { error: "Delay must be a number between 0 and 720 hours." },
      { status: 400 },
    );
  }

  if (offerId) {
    const offer = await prisma.loyaltyOffer.findFirst({
      where: { id: offerId, businessId },
      select: { id: true },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found for this business." }, { status: 404 });
    }
  }

  if (templateId) {
    const template = await prisma.loyaltyTemplate.findFirst({
      where: { id: templateId, businessId },
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found for this business." }, { status: 404 });
    }
  }

  const playbook = await prisma.loyaltyPlaybook.create({
    data: {
      businessId,
      name,
      type: LoyaltyPlaybookType[body.type as keyof typeof LoyaltyPlaybookType],
      status: LoyaltyPlaybookStatus.ACTIVE,
      audience: LoyaltyAudience[body.audience as keyof typeof LoyaltyAudience],
      trigger: LoyaltyTrigger[body.trigger as keyof typeof LoyaltyTrigger],
      delayHours,
      suppressIfBooked,
      offerId: offerId || null,
      templateId: templateId || null,
      startedAt: new Date(),
    },
    include: {
      offer: {
        select: {
          id: true,
          name: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
  });

  await trackValidationEvent({
    event: validationEvent.loyaltyPlaybookCreated,
    businessId,
    metadata: {
      playbookId: playbook.id,
      type: playbook.type,
      trigger: playbook.trigger,
    },
  });

  return NextResponse.json({ ok: true, playbook }, { status: 201 });
}
