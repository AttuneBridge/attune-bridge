-- CreateEnum
CREATE TYPE "ContactConsentStatus" AS ENUM ('UNKNOWN', 'OPTED_IN', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "ContactChannelPreference" AS ENUM ('NONE', 'SMS', 'EMAIL', 'CALL');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('MANUAL', 'FEEDBACK', 'SCHEDULER', 'LOYALTY', 'MISSED_CALL');

-- CreateTable
CREATE TABLE "ContactProfile" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "fullName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "normalizedEmail" TEXT,
  "normalizedPhone" TEXT,
  "consentStatus" "ContactConsentStatus" NOT NULL DEFAULT 'UNKNOWN',
  "channelPreference" "ContactChannelPreference" NOT NULL DEFAULT 'NONE',
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "source" "ContactSource" NOT NULL DEFAULT 'MANUAL',
  "lastInteractionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactProfile_businessId_normalizedEmail_key" ON "ContactProfile"("businessId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ContactProfile_businessId_normalizedPhone_key" ON "ContactProfile"("businessId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "ContactProfile_businessId_consentStatus_updatedAt_idx" ON "ContactProfile"("businessId", "consentStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "ContactProfile_businessId_channelPreference_idx" ON "ContactProfile"("businessId", "channelPreference");

-- AddForeignKey
ALTER TABLE "ContactProfile"
ADD CONSTRAINT "ContactProfile_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
