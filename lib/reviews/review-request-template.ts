export const DEFAULT_REVIEW_REQUEST_TEMPLATE =
  "Thanks for choosing {businessName}! We'd love your feedback: {formUrl}";

type BuildReviewRequestMessageInput = {
  template: string | null;
  businessName: string;
  formUrl: string;
};

export function buildReviewRequestMessage({
  template,
  businessName,
  formUrl,
}: BuildReviewRequestMessageInput) {
  const rawTemplate = template?.trim() ? template.trim() : DEFAULT_REVIEW_REQUEST_TEMPLATE;

  let message = rawTemplate
    .replaceAll("{{businessName}}", businessName)
    .replaceAll("{businessName}", businessName)
    .replaceAll("{{formUrl}}", formUrl)
    .replaceAll("{formUrl}", formUrl);

  if (!message.includes(formUrl)) {
    message = `${message} ${formUrl}`;
  }

  return message;
}
