-- CreateEnum
CREATE TYPE "RecoveryOutcome" AS ENUM ('SAVED', 'UNSAVED', 'ESCALATED');

-- AlterTable
ALTER TABLE "Feedback"
ADD COLUMN "recoveryOutcome" "RecoveryOutcome",
ADD COLUMN "nextFollowUpAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Feedback_status_recoveryOutcome_nextFollowUpAt_idx" ON "Feedback"("status", "recoveryOutcome", "nextFollowUpAt");
