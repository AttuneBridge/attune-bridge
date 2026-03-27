-- CreateEnum
CREATE TYPE "LoyaltyPlaybookStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "LoyaltyPlaybookType" AS ENUM ('SECOND_VISIT_BOOSTER', 'WE_MISS_YOU', 'VIP_THANK_YOU', 'SERVICE_RECOVERY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LoyaltyAudience" AS ENUM ('FIRST_TIME', 'REPEAT', 'LAPSED_30_DAYS', 'HIGH_FREQUENCY');

-- CreateEnum
CREATE TYPE "LoyaltyTrigger" AS ENUM ('FEEDBACK_POSITIVE', 'FEEDBACK_NEUTRAL', 'FEEDBACK_NEGATIVE', 'LIFECYCLE_LAPSED_30_DAYS');

-- CreateEnum
CREATE TYPE "LoyaltyOfferKind" AS ENUM ('FLAT_DISCOUNT', 'FREE_ADD_ON', 'PRIORITY_ACCESS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LoyaltyTemplateCategory" AS ENUM ('GREAT', 'OKAY', 'NOT_GOOD', 'LAPSED');

-- CreateEnum
CREATE TYPE "LoyaltyChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "LoyaltyMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED', 'CANCELED');

-- CreateEnum
CREATE TYPE "LoyaltyConversionType" AS ENUM ('BOOKING', 'REVIEW');

-- CreateTable
CREATE TABLE "LoyaltyPlaybook" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LoyaltyPlaybookType" NOT NULL,
    "status" "LoyaltyPlaybookStatus" NOT NULL DEFAULT 'ACTIVE',
    "audience" "LoyaltyAudience" NOT NULL,
    "trigger" "LoyaltyTrigger" NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 48,
    "suppressIfBooked" BOOLEAN NOT NULL DEFAULT true,
    "offerId" TEXT,
    "templateId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyOffer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LoyaltyOfferKind" NOT NULL,
    "valueText" TEXT NOT NULL,
    "validDays" INTEGER NOT NULL DEFAULT 14,
    "code" TEXT,
    "maxRedemptions" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LoyaltyTemplateCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "playbookId" TEXT,
    "templateId" TEXT,
    "offerId" TEXT,
    "feedbackId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "trackingToken" TEXT NOT NULL,
    "channel" "LoyaltyChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "LoyaltyMessageStatus" NOT NULL DEFAULT 'PENDING',
    "sendAfter" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyConversion" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "LoyaltyConversionType" NOT NULL,
    "metadata" JSONB,
    "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyPlaybook_businessId_status_idx" ON "LoyaltyPlaybook"("businessId", "status");

-- CreateIndex
CREATE INDEX "LoyaltyPlaybook_businessId_trigger_status_idx" ON "LoyaltyPlaybook"("businessId", "trigger", "status");

-- CreateIndex
CREATE INDEX "LoyaltyPlaybook_businessId_audience_status_idx" ON "LoyaltyPlaybook"("businessId", "audience", "status");

-- CreateIndex
CREATE INDEX "LoyaltyOffer_businessId_isActive_createdAt_idx" ON "LoyaltyOffer"("businessId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyTemplate_businessId_category_isDefault_idx" ON "LoyaltyTemplate"("businessId", "category", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyMessage_trackingToken_key" ON "LoyaltyMessage"("trackingToken");

-- CreateIndex
CREATE INDEX "LoyaltyMessage_businessId_status_sendAfter_idx" ON "LoyaltyMessage"("businessId", "status", "sendAfter");

-- CreateIndex
CREATE INDEX "LoyaltyMessage_businessId_createdAt_idx" ON "LoyaltyMessage"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyMessage_feedbackId_createdAt_idx" ON "LoyaltyMessage"("feedbackId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyMessage_customerEmail_createdAt_idx" ON "LoyaltyMessage"("customerEmail", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyConversion_businessId_type_convertedAt_idx" ON "LoyaltyConversion"("businessId", "type", "convertedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyConversion_messageId_type_key" ON "LoyaltyConversion"("messageId", "type");

-- AddForeignKey
ALTER TABLE "LoyaltyPlaybook" ADD CONSTRAINT "LoyaltyPlaybook_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPlaybook" ADD CONSTRAINT "LoyaltyPlaybook_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "LoyaltyOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPlaybook" ADD CONSTRAINT "LoyaltyPlaybook_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LoyaltyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyOffer" ADD CONSTRAINT "LoyaltyOffer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTemplate" ADD CONSTRAINT "LoyaltyTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMessage" ADD CONSTRAINT "LoyaltyMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMessage" ADD CONSTRAINT "LoyaltyMessage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMessage" ADD CONSTRAINT "LoyaltyMessage_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "LoyaltyPlaybook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMessage" ADD CONSTRAINT "LoyaltyMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LoyaltyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMessage" ADD CONSTRAINT "LoyaltyMessage_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "LoyaltyOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMessage" ADD CONSTRAINT "LoyaltyMessage_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyConversion" ADD CONSTRAINT "LoyaltyConversion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyConversion" ADD CONSTRAINT "LoyaltyConversion_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "LoyaltyMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
