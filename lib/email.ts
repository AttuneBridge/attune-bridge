import { Resend } from "resend";

type NotificationInput = {
  businessEmail: string;
  locationName: string;
  sentiment: "positive" | "neutral" | "negative";
  message: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
};

type NotificationResult = {
  sent: boolean;
  skipped: boolean;
};

export async function sendFeedbackNotification(
  input: NotificationInput,
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(
      "Feedback notification skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    );
    return { sent: false, skipped: true };
  }

  const resend = new Resend(apiKey);

  const details = [
    `Location: ${input.locationName}`,
    `Sentiment: ${input.sentiment}`,
    `Message: ${input.message ?? "(no message provided)"}`,
    `Customer name: ${input.customerName ?? "(not provided)"}`,
    `Customer email: ${input.customerEmail ?? "(not provided)"}`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.businessEmail,
      subject: `New private feedback (${input.sentiment})`,
      text: `You received new private feedback.\n\n${details}`,
      html: `<p>You received new private feedback.</p><pre>${details}</pre>`,
    });

    return { sent: true, skipped: false };
  } catch (error) {
    console.warn("Feedback notification failed.", error);
    return { sent: false, skipped: true };
  }
}
