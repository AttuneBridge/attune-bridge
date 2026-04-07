-- CreateEnum
CREATE TYPE "FeatureRequestModule" AS ENUM ('REVIEWS', 'SCHEDULER', 'LOYALTY', 'MISSED_CALL_TEXTBACK', 'PLATFORM');

-- AlterTable
ALTER TABLE "OwnerFeatureRequest"
ADD COLUMN "module" "FeatureRequestModule" NOT NULL DEFAULT 'PLATFORM';

-- DropIndex
DROP INDEX "OwnerFeatureRequest_businessId_createdAt_idx";

-- CreateIndex
CREATE INDEX "OwnerFeatureRequest_businessId_module_createdAt_idx" ON "OwnerFeatureRequest"("businessId", "module", "createdAt");
