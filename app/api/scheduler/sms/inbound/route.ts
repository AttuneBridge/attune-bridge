import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/scheduler/utils";
import { trackValidationEvent, validationEvent } from "@/lib/validation-events";

const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_KEYWORDS = new Set(["START", "UNSTOP"]);

function parseMessageKeyword(rawBody: string) {
  const trimmed = rawBody.trim().toUpperCase();

  if (!trimmed) {
    return null;
  }

  const [keyword] = trimmed.split(/\s+/);
  return keyword ?? null;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  let from = "";
  let body = "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    from = typeof formData.get("From") === "string" ? String(formData.get("From")) : "";
    body = typeof formData.get("Body") === "string" ? String(formData.get("Body")) : "";
  } else {
    const json = (await request.json().catch(() => null)) as { from?: unknown; body?: unknown } | null;
    from = json && typeof json.from === "string" ? json.from : "";
    body = json && typeof json.body === "string" ? json.body : "";
  }

  const normalizedFrom = normalizePhone(from);
  const keyword = parseMessageKeyword(body);

  if (!normalizedFrom || !keyword) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!STOP_KEYWORDS.has(keyword)) {
    if (!START_KEYWORDS.has(keyword)) {
      return NextResponse.json({ ok: true, ignored: true });
    }
  }

  const contacts = await prisma.schedulerContact.findMany({
    where: {
      phone: normalizedFrom,
    },
    select: {
      id: true,
      businessId: true,
      isActive: true,
      optedOutAt: true,
      optedOutReason: true,
    },
  });

  if (contacts.length === 0) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const now = new Date();

  if (STOP_KEYWORDS.has(keyword)) {
    const contactsToUpdate = contacts.filter(
      (contact) => contact.isActive || contact.optedOutAt === null || contact.optedOutReason === null,
    );

    if (contactsToUpdate.length > 0) {
      await prisma.schedulerContact.updateMany({
        where: {
          id: {
            in: contactsToUpdate.map((contact) => contact.id),
          },
        },
        data: {
          isActive: false,
          optedOutAt: now,
          optedOutReason: `SMS_${keyword}`,
        },
      });

      for (const contact of contactsToUpdate) {
        await trackValidationEvent({
          event: validationEvent.schedulerContactOptedOut,
          businessId: contact.businessId,
          metadata: {
            contactId: contact.id,
            keyword,
            via: "twilio_inbound",
          },
        });
      }
    }

    const twiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>You are unsubscribed from last-minute offer texts.</Message></Response>";

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const contactsToReactivate = contacts.filter(
    (contact) => contact.optedOutAt !== null || contact.optedOutReason !== null,
  );

  if (contactsToReactivate.length > 0) {
    await prisma.schedulerContact.updateMany({
      where: {
        id: {
          in: contactsToReactivate.map((contact) => contact.id),
        },
      },
      data: {
        isActive: true,
        optedOutAt: null,
        optedOutReason: null,
        optedInAt: now,
      },
    });

    for (const contact of contactsToReactivate) {
      await trackValidationEvent({
        event: validationEvent.schedulerContactOptedIn,
        businessId: contact.businessId,
        metadata: {
          contactId: contact.id,
          keyword,
          via: "twilio_inbound",
        },
      });
    }
  }

  const twiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>You are re-subscribed to last-minute offer texts.</Message></Response>";

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
