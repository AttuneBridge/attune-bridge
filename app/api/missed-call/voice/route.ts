import { NextResponse } from "next/server";
import { AppModule, MissedCallSmsStatus } from "@prisma/client";
import { getAppUrl } from "@/lib/app-url";
import { getModuleSubscriptionForBusiness } from "@/lib/module-subscriptions";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/scheduler/utils";
import { sendSmsNotification } from "@/lib/sms";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

function buildTwiMl(input: { forwardPhone: string | null; actionUrl: string }) {
  if (!input.forwardPhone) {
    return '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>';
  }

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial timeout="20" action="${input.actionUrl}" method="POST">${input.forwardPhone}</Dial></Response>`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = typeof formData.get("CallSid") === "string" ? String(formData.get("CallSid")).trim() : "";
  const from = typeof formData.get("From") === "string" ? String(formData.get("From")) : "";
  const to = typeof formData.get("To") === "string" ? String(formData.get("To")) : "";
  const normalizedFrom = normalizePhone(from);
  const normalizedTo = normalizePhone(to);

  if (!normalizedTo) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const config = await prisma.missedCallConfig.findUnique({
    where: {
      twilioPhone: normalizedTo,
    },
    select: {
      businessId: true,
      twilioPhone: true,
      autoReplyMessage: true,
      isActive: true,
      business: {
        select: {
          alertPhone: true,
        },
      },
    },
  });

  if (!config || !config.isActive) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy" /></Response>', {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const subscription = await getModuleSubscriptionForBusiness(config.businessId, AppModule.MISSED_CALL_TEXTBACK);

  if (!subscription.isEnabled) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy" /></Response>', {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  if (!config.business.alertPhone && callSid && normalizedFrom) {
    const existingEvent = await prisma.missedCallEvent.findUnique({
      where: {
        twilioCallSid: callSid,
      },
      select: {
        id: true,
      },
    });

    if (!existingEvent) {
      const event = await prisma.missedCallEvent.create({
        data: {
          businessId: config.businessId,
          callerPhone: normalizedFrom,
          twilioCallSid: callSid,
        },
        select: {
          id: true,
        },
      });

      const smsResult = await sendSmsNotification({
        toPhone: normalizedFrom,
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
          callSid,
          callerPhone: normalizedFrom,
          smsStatus,
          source: "voice_fallback",
        },
      });
    }
  }

  const actionUrl = `${getAppUrl()}/api/missed-call/dial-result`;
  const twiml = buildTwiMl({
    forwardPhone: config.business.alertPhone,
    actionUrl,
  });

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
