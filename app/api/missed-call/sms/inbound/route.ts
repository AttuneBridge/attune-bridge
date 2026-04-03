import { AppModule } from "@prisma/client";
import { NextResponse } from "next/server";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/scheduler/utils";
import { sendSmsNotification } from "@/lib/sms";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

function parseMessageKeyword(rawBody: string) {
  const trimmed = rawBody.trim().toUpperCase();

  if (!trimmed) {
    return null;
  }

  const [keyword] = trimmed.split(/\s+/);
  return keyword ?? null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const fromRaw = typeof formData.get("From") === "string" ? String(formData.get("From")) : "";
  const toRaw = typeof formData.get("To") === "string" ? String(formData.get("To")) : "";
  const body = typeof formData.get("Body") === "string" ? String(formData.get("Body")) : "";

  const from = normalizePhone(fromRaw);
  const to = normalizePhone(toRaw);
  const keyword = parseMessageKeyword(body);

  if (!from || !to || !body.trim()) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (keyword && STOP_KEYWORDS.has(keyword)) {
    const twiml =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>You are unsubscribed. Reply START to subscribe again.</Message></Response>';
    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const config = await prisma.missedCallConfig.findUnique({
    where: {
      twilioPhone: to,
    },
    select: {
      businessId: true,
      twilioPhone: true,
      isActive: true,
      business: {
        select: {
          alertPhone: true,
          name: true,
        },
      },
    },
  });

  if (!config || !config.isActive || !config.business.alertPhone) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const subscription = await getModuleSubscriptionForBusiness(config.businessId, AppModule.MISSED_CALL_TEXTBACK);

  if (!subscription.isEnabled) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const forwardBody = `${config.business.name}: reply from ${from} - ${body.trim()}`;

  await sendSmsNotification({
    toPhone: config.business.alertPhone,
    fromPhone: config.twilioPhone,
    body: forwardBody,
  });

  await prisma.missedCallEvent.updateMany({
    where: {
      businessId: config.businessId,
      callerPhone: from,
      replyForwardedAt: null,
    },
    data: {
      replyForwardedAt: new Date(),
    },
  });

  await trackValidationEvent({
    event: validationEvent.missedCallReplyForwarded,
    businessId: config.businessId,
    metadata: {
      callerPhone: from,
      to: config.business.alertPhone,
    },
  });

  const twiml =
    '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks - your message was sent to the business.</Message></Response>';
  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
