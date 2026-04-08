import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const validationEvent = {
  signupStarted: "signup_started",
  signupCompleted: "signup_completed",
  qrViewed: "qr_viewed",
  manageViewed: "manage_viewed",
  feedbackSubmitted: "feedback_submitted",
  reviewRedirectOpened: "review_redirect_opened",
  reviewsCaseStatusUpdated: "reviews_case_status_updated",
  reviewsCaseAssigned: "reviews_case_assigned",
  reviewsRecoveryPlaybookApplied: "reviews_recovery_playbook_applied",
  reviewsRecoveryOutcomeUpdated: "reviews_recovery_outcome_updated",
  reviewsFollowUpReminderSet: "reviews_follow_up_reminder_set",
  reviewsFollowUpReminderCleared: "reviews_follow_up_reminder_cleared",
  reviewsInternalNotesUpdated: "reviews_internal_notes_updated",
  subscriptionStarted: "subscription_started",
  subscriptionCanceled: "subscription_canceled",
  moduleSubscriptionUpdated: "module_subscription_updated",
  ownerFeatureRequestSubmitted: "owner_feature_request_submitted",
  ownerAccessLinkIssued: "owner_access_link_issued",
  schedulerContactAdded: "scheduler_contact_added",
  schedulerOfferSent: "scheduler_offer_sent",
  schedulerOfferClaimed: "scheduler_offer_claimed",
  schedulerOfferClosed: "scheduler_offer_closed",
  schedulerContactOptedOut: "scheduler_contact_opted_out",
  schedulerContactOptedIn: "scheduler_contact_opted_in",
  loyaltyPlaybookCreated: "loyalty_playbook_created",
  loyaltyOfferCreated: "loyalty_offer_created",
  loyaltyTemplateCreated: "loyalty_template_created",
  loyaltyMessagesQueued: "loyalty_messages_queued",
  loyaltyMessagesProcessed: "loyalty_messages_processed",
  loyaltyRecoveryResolved: "loyalty_recovery_resolved",
  missedCallAutoReplySent: "missed_call_auto_reply_sent",
  missedCallReplyForwarded: "missed_call_reply_forwarded",
} as const;

type ValidationEventName = (typeof validationEvent)[keyof typeof validationEvent];

type TrackValidationEventInput = {
  event: ValidationEventName;
  businessId?: string | null;
  locationId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function trackValidationEvent(input: TrackValidationEventInput) {
  try {
    await prisma.validationEvent.create({
      data: {
        event: input.event,
        businessId: input.businessId ?? null,
        locationId: input.locationId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch {
    return;
  }
}
