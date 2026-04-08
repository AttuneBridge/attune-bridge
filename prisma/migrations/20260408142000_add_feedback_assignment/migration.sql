-- AlterTable
ALTER TABLE "Feedback"
ADD COLUMN "assignedMembershipId" TEXT;

-- CreateIndex
CREATE INDEX "Feedback_assignedMembershipId_idx" ON "Feedback"("assignedMembershipId");

-- AddForeignKey
ALTER TABLE "Feedback"
ADD CONSTRAINT "Feedback_assignedMembershipId_fkey"
FOREIGN KEY ("assignedMembershipId") REFERENCES "BusinessMembership"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
