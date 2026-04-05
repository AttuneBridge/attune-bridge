import { Resend } from "resend";
import { isDemoModeEnabled } from "@/lib/demo/config";

type NotificationInput = {
  businessEmail: string;
  locationName: string;
  sentiment: "positive" | "neutral" | "negative";
  message: string | null;
  wantsFollowUp: boolean;
  followUpPreference?: "text" | "call" | "email" | null;
  phone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
};

type NotificationResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorMessage: string | null;
};

type LoyaltyEmailInput = {
  toEmail: string;
  customerName?: string | null;
  businessName: string;
  subject: string;
  previewText?: string | null;
  body: string;
  ctaLabel: string;
  offerText?: string | null;
  bookingLink?: string | null;
  reviewLink?: string | null;
};

function interpolateTemplate(
  template: string,
  input: {
    firstName: string;
    businessName: string;
    offerText: string;
    bookingLink: string;
    reviewLink: string;
  },
) {
  return template
    .replaceAll("{first_name}", input.firstName)
    .replaceAll("{business_name}", input.businessName)
    .replaceAll("{offer_text}", input.offerText)
    .replaceAll("{booking_link}", input.bookingLink)
    .replaceAll("{review_link}", input.reviewLink);
}

export async function sendFeedbackNotification(
  input: NotificationInput,
): Promise<NotificationResult> {
  if (isDemoModeEnabled()) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "Demo mode skips outbound email sends.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(
      "Feedback notification skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    );
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "Email provider is not configured.",
    };
  }

  const resend = new Resend(apiKey);

  const details = [
    `Location: ${input.locationName}`,
    `Sentiment: ${input.sentiment}`,
    `Message: ${input.message ?? "(no message provided)"}`,
    `Follow-up requested: ${input.wantsFollowUp ? "Yes" : "No"}`,
    `Preferred contact method: ${input.followUpPreference ?? "(not selected)"}`,
    `Phone: ${input.phone ?? "(not provided)"}`,
    `Customer name: ${input.customerName ?? "(not provided)"}`,
    `Customer email: ${input.customerEmail ?? "(not provided)"}`,
  ].join("\n");

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: input.businessEmail,
      subject: `New private feedback (${input.sentiment})`,
      text: `You received new private feedback.\n\n${details}`,
      html: `<p>You received new private feedback.</p><pre>${details}</pre>`,
    });

    return {
      sent: true,
      skipped: false,
      providerMessageId: result.data?.id ?? null,
      errorMessage: null,
    };
  } catch (error) {
    console.warn("Feedback notification failed.", error);
    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorMessage: "Email provider request failed.",
    };
  }
}

export async function sendLoyaltyMessageEmail(input: LoyaltyEmailInput): Promise<NotificationResult> {
  if (isDemoModeEnabled()) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "Demo mode skips outbound email sends.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(
      "Loyalty email skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    );
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorMessage: "Email provider is not configured.",
    };
  }

  const resend = new Resend(apiKey);
  const firstName = input.customerName?.trim() ? input.customerName.trim() : "there";
  const bookingLink =
    input.bookingLink?.trim() || process.env.LOYALTY_DEFAULT_BOOKING_LINK || "https://example.com/book";
  const reviewLink = input.reviewLink?.trim() || bookingLink;
  const offerText = input.offerText?.trim() || "a thank-you perk";

  const subject = interpolateTemplate(input.subject, {
    firstName,
    businessName: input.businessName,
    offerText,
    bookingLink,
    reviewLink,
  });
  const previewText = input.previewText
    ? interpolateTemplate(input.previewText, {
        firstName,
        businessName: input.businessName,
        offerText,
        bookingLink,
        reviewLink,
      })
    : null;
  const body = interpolateTemplate(input.body, {
    firstName,
    businessName: input.businessName,
    offerText,
    bookingLink,
    reviewLink,
  });

  const textBody = [body, "", `${input.ctaLabel}: ${bookingLink}`].join("\n");
  const htmlBody = [
    `<p>${body}</p>`,
    `<p><a href="${bookingLink}">${input.ctaLabel}</a></p>`,
  ].join("");

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: input.toEmail,
      subject,
      text: previewText ? `${previewText}\n\n${textBody}` : textBody,
      html: previewText ? `<p>${previewText}</p>${htmlBody}` : htmlBody,
    });

    return {
      sent: true,
      skipped: false,
      providerMessageId: result.data?.id ?? null,
      errorMessage: null,
    };
  } catch (error) {
    console.warn("Loyalty email send failed.", error);
    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorMessage: "Email provider request failed.",
    };
  }
}
