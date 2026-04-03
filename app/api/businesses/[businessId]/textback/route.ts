import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/scheduler/utils";
import { getTextBackAccessResult } from "@/lib/textback/access";

type UpdateTextBackBody = {
  manageToken?: unknown;
  twilioPhone?: unknown;
  autoReplyMessage?: unknown;
  isActive?: unknown;
  replyForwardPhone?: unknown;
};

const DEFAULT_AUTO_REPLY = "Hey - sorry we missed your call. How can we help?";

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(request.url);
  const manageToken = searchParams.get("token")?.trim();

  const access = await getTextBackAccessResult(businessId, manageToken);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [config, business, events] = await Promise.all([
    prisma.missedCallConfig.findUnique({
      where: { businessId },
      select: {
        twilioPhone: true,
        autoReplyMessage: true,
        isActive: true,
      },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        alertPhone: true,
      },
    }),
    prisma.missedCallEvent.findMany({
      where: { businessId },
      select: {
        id: true,
        callerPhone: true,
        smsStatus: true,
        errorMessage: true,
        createdAt: true,
        replyForwardedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    config: {
      twilioPhone: config?.twilioPhone ?? "",
      autoReplyMessage: config?.autoReplyMessage ?? DEFAULT_AUTO_REPLY,
      isActive: config?.isActive ?? true,
      replyForwardPhone: business?.alertPhone ?? "",
    },
    events,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await context.params;
  let body: UpdateTextBackBody;

  try {
    body = (await request.json()) as UpdateTextBackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getTextBackAccessResult(
    businessId,
    typeof body.manageToken === "string" ? body.manageToken : undefined,
  );

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const autoReplyMessage =
    typeof body.autoReplyMessage === "string" ? body.autoReplyMessage.trim() : DEFAULT_AUTO_REPLY;
  const twilioPhoneRaw = typeof body.twilioPhone === "string" ? body.twilioPhone.trim() : "";
  const replyForwardPhoneRaw = typeof body.replyForwardPhone === "string" ? body.replyForwardPhone.trim() : "";
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
  const twilioPhone = normalizePhone(twilioPhoneRaw);
  const replyForwardPhone = normalizePhone(replyForwardPhoneRaw);

  if (!twilioPhone || twilioPhone.length < 10) {
    return NextResponse.json({ error: "A valid Twilio phone number is required." }, { status: 400 });
  }

  if (autoReplyMessage.length < 8) {
    return NextResponse.json({ error: "Auto-reply message must be at least 8 characters." }, { status: 400 });
  }

  if (autoReplyMessage.length > 320) {
    return NextResponse.json({ error: "Auto-reply message must be 320 characters or fewer." }, { status: 400 });
  }

  if (replyForwardPhoneRaw.length > 0 && (!replyForwardPhone || replyForwardPhone.length < 10)) {
    return NextResponse.json({ error: "Reply forwarding phone must be a valid phone number." }, { status: 400 });
  }

  try {
    const [config] = await prisma.$transaction([
      prisma.missedCallConfig.upsert({
        where: { businessId },
        update: {
          twilioPhone,
          autoReplyMessage,
          isActive,
        },
        create: {
          businessId,
          twilioPhone,
          autoReplyMessage,
          isActive,
        },
        select: {
          twilioPhone: true,
          autoReplyMessage: true,
          isActive: true,
        },
      }),
      prisma.business.update({
        where: { id: businessId },
        data: {
          alertPhone: replyForwardPhone || null,
        },
        select: {
          alertPhone: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      config,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          error: "That Twilio phone number is already assigned to another business.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Could not save missed call settings." }, { status: 500 });
  }
}
