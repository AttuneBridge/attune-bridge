import { isDemoModeEnabled } from "@/lib/demo/config";

type SmsResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
};

type SendSmsInput = {
  toPhone: string;
  body: string;
  fromPhone?: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^+\d]/g, "");
}

export async function sendSmsNotification(input: SendSmsInput): Promise<SmsResult> {
  if (isDemoModeEnabled()) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "Demo mode skips outbound SMS sends.",
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = input.fromPhone ?? process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "SMS provider is not configured.",
    };
  }

  const to = normalizePhone(input.toPhone);
  const from = normalizePhone(fromPhone);

  if (!to || !from) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "Missing sender or recipient phone number.",
    };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const payload = new URLSearchParams({
    To: to,
    From: from,
    Body: input.body,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const result = (await response.json()) as { sid?: string; message?: string };

    if (!response.ok) {
      return {
        sent: false,
        skipped: false,
        providerMessageId: null,
        errorMessage: result.message ?? "SMS provider request failed.",
      };
    }

    return {
      sent: true,
      skipped: false,
      providerMessageId: result.sid ?? null,
      errorMessage: null,
    };
  } catch {
    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorMessage: "SMS provider request failed.",
    };
  }
}

export function formatSmsAlertBody(input: {
  businessName: string;
  locationName: string;
  message: string | null;
  followUpPreference: "text" | "call" | "email" | null;
}) {
  const preference = input.followUpPreference ?? "none";
  const messageSnippet = input.message?.trim() || "(no message provided)";
  return `${input.businessName}: new negative feedback at ${input.locationName}. Follow-up preference: ${preference}. Message: ${messageSnippet}`;
}
