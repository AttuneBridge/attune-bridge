-- CreateEnum
CREATE TYPE "MissedCallSmsStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'MISSED_CALL_TEXTBACK';

-- CreateTable
CREATE TABLE "MissedCallConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "twilioPhone" TEXT NOT NULL,
    "autoReplyMessage" TEXT NOT NULL DEFAULT 'Hey - sorry we missed your call. How can we help?',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissedCallConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissedCallEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "twilioCallSid" TEXT NOT NULL,
    "smsStatus" "MissedCallSmsStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "replyForwardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissedCallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissedCallConfig_businessId_key" ON "MissedCallConfig"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "MissedCallConfig_twilioPhone_key" ON "MissedCallConfig"("twilioPhone");

-- CreateIndex
CREATE INDEX "MissedCallConfig_twilioPhone_idx" ON "MissedCallConfig"("twilioPhone");

-- CreateIndex
CREATE UNIQUE INDEX "MissedCallEvent_twilioCallSid_key" ON "MissedCallEvent"("twilioCallSid");

-- CreateIndex
CREATE INDEX "MissedCallEvent_businessId_createdAt_idx" ON "MissedCallEvent"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "MissedCallEvent_businessId_callerPhone_idx" ON "MissedCallEvent"("businessId", "callerPhone");

-- AddForeignKey
ALTER TABLE "MissedCallConfig" ADD CONSTRAINT "MissedCallConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissedCallEvent" ADD CONSTRAINT "MissedCallEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
