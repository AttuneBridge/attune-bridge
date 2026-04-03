import { AppModule, MissedCallSmsStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/scheduler/utils";
import { sendSmsNotification } from "@/lib/sms";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

const MISSED_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

export async function POST(request: Request) {
  const formData = await request.formData();

  const dialStatus =
    typeof formData.get("DialCallStatus") === "string"
      ? String(formData.get("DialCallStatus")).trim().toLowerCase()
      : "";
  const callSidRaw =
    (typeof formData.get("CallSid") === "string" ? String(formData.get("CallSid")) : "") ||
    (typeof formData.get("ParentCallSid") === "string" ? String(formData.get("ParentCallSid")) : "");
  const fromRaw = typeof formData.get("From") === "string" ? String(formData.get("From")) : "";
  const toRaw = typeof formData.get("To") === "string" ? String(formData.get("To")) : "";
  const from = normalizePhone(fromRaw);
  const to = normalizePhone(toRaw);

  if (!MISSED_STATUSES.has(dialStatus) || !callSidRaw || !from || !to) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
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
      autoReplyMessage: true,
      isActive: true,
    },
  });

  if (!config || !config.isActive) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const subscription = await getModuleSubscriptionForBusiness(config.businessId, AppModule.MISSED_CALL_TEXTBACK);

  if (!subscription.isEnabled) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const existingEvent = await prisma.missedCallEvent.findUnique({
    where: {
      twilioCallSid: callSidRaw,
    },
    select: {
      id: true,
    },
  });

  if (existingEvent) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const event = await prisma.missedCallEvent.create({
    data: {
      businessId: config.businessId,
      callerPhone: from,
      twilioCallSid: callSidRaw,
    },
    select: {
      id: true,
    },
  });

  const smsResult = await sendSmsNotification({
    toPhone: from,
    fromPhone: config.twilioPhone,
    body: config.autoReplyMessage,
  });

  const smsStatus = smsResult.sent
    ? MissedCallSmsStatus.SENT
    : smsResult.skipped
      ? MissedCallSmsStatus.SKIPPED
      : MissedCallSmsStatus.FAILED;

  await prisma.missedCallEvent.update({
    where: {
      id: event.id,
    },
    data: {
      smsStatus,
      providerMessageId: smsResult.providerMessageId,
      errorMessage: smsResult.errorMessage,
    },
  });

  await trackValidationEvent({
    event: validationEvent.missedCallAutoReplySent,
    businessId: config.businessId,
    metadata: {
      callSid: callSidRaw,
      callerPhone: from,
      smsStatus,
    },
  });

  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
