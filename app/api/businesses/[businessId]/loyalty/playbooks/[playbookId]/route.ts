import {
  LoyaltyAudience,
  LoyaltyPlaybookStatus,
  LoyaltyPlaybookType,
  LoyaltyTrigger,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getLoyaltyAccessResult } from "@/lib/loyalty/access";
import { prisma } from "@/lib/prisma";

type UpdatePlaybookRequestBody = {
  name?: unknown;
  type?: unknown;
  status?: unknown;
  audience?: unknown;
  trigger?: unknown;
  delayHours?: unknown;
  suppressIfBooked?: unknown;
  offerId?: unknown;
  templateId?: unknown;
  manageToken?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string; playbookId: string }> },
) {
  const { businessId, playbookId } = await context.params;
  let body: UpdatePlaybookRequestBody;

  try {
    body = (await request.json()) as UpdatePlaybookRequestBody;
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

  const existing = await prisma.loyaltyPlaybook.findFirst({
    where: { id: playbookId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Playbook not found." }, { status: 404 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const delayHoursRaw = typeof body.delayHours === "number" ? body.delayHours : Number(body.delayHours);
  const delayHours = Number.isFinite(delayHoursRaw) ? Math.floor(delayHoursRaw) : undefined;
  const suppressIfBooked =
    typeof body.suppressIfBooked === "boolean" ? body.suppressIfBooked : undefined;
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : undefined;
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : undefined;

  if (name !== undefined && (!name || name.length > 80)) {
    return NextResponse.json(
      { error: "Playbook name must be between 1 and 80 characters." },
      { status: 400 },
    );
  }

  if (delayHours !== undefined && (delayHours < 0 || delayHours > 24 * 30)) {
    return NextResponse.json(
      { error: "Delay must be a number between 0 and 720 hours." },
      { status: 400 },
    );
  }

  if (body.type !== undefined && !(typeof body.type === "string" && body.type in LoyaltyPlaybookType)) {
    return NextResponse.json({ error: "Invalid playbook type." }, { status: 400 });
  }

  if (body.status !== undefined && !(typeof body.status === "string" && body.status in LoyaltyPlaybookStatus)) {
    return NextResponse.json({ error: "Invalid playbook status." }, { status: 400 });
  }

  if (body.audience !== undefined && !(typeof body.audience === "string" && body.audience in LoyaltyAudience)) {
    return NextResponse.json({ error: "Invalid audience value." }, { status: 400 });
  }

  if (body.trigger !== undefined && !(typeof body.trigger === "string" && body.trigger in LoyaltyTrigger)) {
    return NextResponse.json({ error: "Invalid trigger value." }, { status: 400 });
  }

  if (offerId !== undefined && offerId.length > 0) {
    const offer = await prisma.loyaltyOffer.findFirst({
      where: { id: offerId, businessId },
      select: { id: true },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found for this business." }, { status: 404 });
    }
  }

  if (templateId !== undefined && templateId.length > 0) {
    const template = await prisma.loyaltyTemplate.findFirst({
      where: { id: templateId, businessId },
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found for this business." }, { status: 404 });
    }
  }

  const nextStatus =
    typeof body.status === "string"
      ? LoyaltyPlaybookStatus[body.status as keyof typeof LoyaltyPlaybookStatus]
      : undefined;

  const playbook = await prisma.loyaltyPlaybook.update({
    where: { id: playbookId },
    data: {
      ...(name === undefined ? {} : { name }),
      ...(body.type === undefined
        ? {}
        : { type: LoyaltyPlaybookType[body.type as keyof typeof LoyaltyPlaybookType] }),
      ...(nextStatus === undefined ? {} : { status: nextStatus }),
      ...(body.audience === undefined
        ? {}
        : { audience: LoyaltyAudience[body.audience as keyof typeof LoyaltyAudience] }),
      ...(body.trigger === undefined
        ? {}
        : { trigger: LoyaltyTrigger[body.trigger as keyof typeof LoyaltyTrigger] }),
      ...(delayHours === undefined ? {} : { delayHours }),
      ...(suppressIfBooked === undefined ? {} : { suppressIfBooked }),
      ...(offerId === undefined ? {} : { offerId: offerId || null }),
      ...(templateId === undefined ? {} : { templateId: templateId || null }),
      ...(nextStatus === LoyaltyPlaybookStatus.ACTIVE ? { startedAt: new Date(), endedAt: null } : {}),
      ...(nextStatus === LoyaltyPlaybookStatus.PAUSED ? { endedAt: new Date() } : {}),
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

  return NextResponse.json({ ok: true, playbook });
}
