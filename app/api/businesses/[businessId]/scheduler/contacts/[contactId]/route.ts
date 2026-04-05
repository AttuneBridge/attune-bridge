import { AppModule, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getBusinessApiAccessResult } from "@/lib/auth/business-api-access";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/scheduler/utils";

type UpdateContactRequestBody = {
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string; contactId: string }> },
) {
  const { businessId, contactId } = await context.params;
  let body: UpdateContactRequestBody;

  try {
    body = (await request.json()) as UpdateContactRequestBody;
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

  const existing = await prisma.schedulerContact.findFirst({
    where: { id: contactId, businessId },
    select: {
      id: true,
      optedOutAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Contact name cannot be empty." }, { status: 400 });
  }

  if (name && name.length > 80) {
    return NextResponse.json({ error: "Contact name must be 80 characters or fewer." }, { status: 400 });
  }

  if (notes && notes.length > 300) {
    return NextResponse.json({ error: "Notes must be 300 characters or fewer." }, { status: 400 });
  }

  const phone = phoneRaw === undefined ? undefined : normalizePhone(phoneRaw);

  if (phone !== undefined && phone.length < 10) {
    return NextResponse.json({ error: "A valid mobile phone number is required." }, { status: 400 });
  }

  if (isActive === true && existing.optedOutAt) {
    return NextResponse.json(
      {
        error:
          "This contact opted out by SMS. They must text START or UNSTOP before reactivation.",
      },
      { status: 400 },
    );
  }

  try {
    const contact = await prisma.schedulerContact.update({
      where: { id: contactId },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(phone === undefined ? {} : { phone }),
        ...(notes === undefined ? {} : { notes: notes || null }),
        ...(isActive === undefined ? {} : { isActive }),
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

    return NextResponse.json({ ok: true, contact });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This phone number is already in your queue." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Could not update contact." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ businessId: string; contactId: string }> },
) {
  const { businessId, contactId } = await context.params;
  const { searchParams } = new URL(request.url);
  const manageToken = searchParams.get("token")?.trim();

  const access = await hasSchedulerAccess(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const existing = await prisma.schedulerContact.findFirst({
    where: { id: contactId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  await prisma.schedulerContact.delete({
    where: { id: contactId },
  });

  return NextResponse.json({ ok: true });
}
