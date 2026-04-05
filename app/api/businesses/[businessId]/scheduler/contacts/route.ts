import { AppModule, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/scheduler/utils";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

type CreateContactRequestBody = {
  name?: unknown;
  phone?: unknown;
  notes?: unknown;
  isActive?: unknown;
  manageToken?: unknown;
};

async function hasSchedulerAccess(businessId: string, manageToken?: string) {
  const access = await getBusinessApiAccessResult(businessId, manageToken);

  if (!access.ok) {
    return { ok: false as const, status: access.status, error: access.error };
  }

  const subscription = await getModuleSubscriptionForBusiness(businessId, AppModule.SCHEDULER);

  if (!subscription.isEnabled) {
    return { ok: false as const, status: 403, error: "Scheduler module is not active." };
  }

  return { ok: true as const };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(request.url);
  const manageToken = searchParams.get("token")?.trim();

  const access = await hasSchedulerAccess(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const contacts = await prisma.schedulerContact.findMany({
    where: { businessId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      isActive: true,
      notes: true,
      optedInAt: true,
      optedOutAt: true,
      optedOutReason: true,
      lastMessagedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ items: contacts });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: CreateContactRequestBody;

  try {
    body = (await request.json()) as CreateContactRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await hasSchedulerAccess(
    businessId,
    typeof body.manageToken === "string" ? body.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = normalizePhone(phoneRaw);

  if (!name) {
    return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  }

  if (name.length > 80) {
    return NextResponse.json({ error: "Contact name must be 80 characters or fewer." }, { status: 400 });
  }

  if (!phone || phone.length < 10) {
    return NextResponse.json({ error: "A valid mobile phone number is required." }, { status: 400 });
  }

  if (notes.length > 300) {
    return NextResponse.json({ error: "Notes must be 300 characters or fewer." }, { status: 400 });
  }

  try {
    const contact = await prisma.schedulerContact.create({
      data: {
        businessId,
        name,
        phone,
        isActive,
        notes: notes || null,
        optedInAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        notes: true,
        optedInAt: true,
        optedOutAt: true,
        optedOutReason: true,
        lastMessagedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await trackValidationEvent({
      event: validationEvent.schedulerContactAdded,
      businessId,
      metadata: {
        contactId: contact.id,
      },
    });

    return NextResponse.json({ ok: true, contact }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This phone number is already in your queue." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Could not create contact." }, { status: 500 });
  }
}
