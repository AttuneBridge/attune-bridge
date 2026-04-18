-- CreateEnum
CREATE TYPE "ModuleChangeAction" AS ENUM ('ACTIVATE', 'DEACTIVATE');

-- CreateEnum
CREATE TYPE "ModuleChangeRequestStatus" AS ENUM ('PENDING', 'APPLIED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "StripeSubscriptionStatus" AS ENUM ('INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "billingSyncedAt" TIMESTAMP(3),
ADD COLUMN     "stripeCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeStatus" "StripeSubscriptionStatus",
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripeTrialEnd" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BusinessModuleSubscription" ADD COLUMN     "stripeSubscriptionItemId" TEXT;

-- CreateTable
CREATE TABLE "ModuleChangeRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "module" "AppModule" NOT NULL,
    "action" "ModuleChangeAction" NOT NULL,
    "status" "ModuleChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionItemId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleChangeRequest_businessId_status_effectiveAt_idx" ON "ModuleChangeRequest"("businessId", "status", "effectiveAt");

-- CreateIndex
CREATE INDEX "ModuleChangeRequest_module_status_effectiveAt_idx" ON "ModuleChangeRequest"("module", "status", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_eventType_processedAt_idx" ON "StripeWebhookEvent"("eventType", "processedAt");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_businessId_processedAt_idx" ON "StripeWebhookEvent"("businessId", "processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeSubscriptionId_key" ON "Business"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "ModuleChangeRequest" ADD CONSTRAINT "ModuleChangeRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeWebhookEvent" ADD CONSTRAINT "StripeWebhookEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "OwnerFeatureRequestVote_businessId_featureRequestId_createdAt_i" RENAME TO "OwnerFeatureRequestVote_businessId_featureRequestId_created_idx";

