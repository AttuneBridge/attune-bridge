-- CreateEnum
CREATE TYPE "SchedulerOfferStatus" AS ENUM ('DRAFT', 'SENT', 'CLAIMED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SchedulerRecipientSmsStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "SchedulerContact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "optedInAt" TIMESTAMP(3),
    "lastMessagedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerOffer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "serviceLabel" TEXT NOT NULL,
    "discountText" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "SchedulerOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimedByContactId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerOfferRecipient" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "claimToken" TEXT NOT NULL,
    "smsStatus" "SchedulerRecipientSmsStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "smsErrorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulerOfferRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulerContact_businessId_isActive_idx" ON "SchedulerContact"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerContact_businessId_phone_key" ON "SchedulerContact"("businessId", "phone");

-- CreateIndex
CREATE INDEX "SchedulerOffer_businessId_status_createdAt_idx" ON "SchedulerOffer"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SchedulerOffer_locationId_createdAt_idx" ON "SchedulerOffer"("locationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerOfferRecipient_claimToken_key" ON "SchedulerOfferRecipient"("claimToken");

-- CreateIndex
CREATE INDEX "SchedulerOfferRecipient_offerId_smsStatus_idx" ON "SchedulerOfferRecipient"("offerId", "smsStatus");

-- CreateIndex
CREATE INDEX "SchedulerOfferRecipient_contactId_createdAt_idx" ON "SchedulerOfferRecipient"("contactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerOfferRecipient_offerId_contactId_key" ON "SchedulerOfferRecipient"("offerId", "contactId");

-- AddForeignKey
ALTER TABLE "SchedulerContact" ADD CONSTRAINT "SchedulerContact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulerOffer" ADD CONSTRAINT "SchedulerOffer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulerOffer" ADD CONSTRAINT "SchedulerOffer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulerOffer" ADD CONSTRAINT "SchedulerOffer_claimedByContactId_fkey" FOREIGN KEY ("claimedByContactId") REFERENCES "SchedulerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulerOfferRecipient" ADD CONSTRAINT "SchedulerOfferRecipient_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SchedulerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulerOfferRecipient" ADD CONSTRAINT "SchedulerOfferRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "SchedulerContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
