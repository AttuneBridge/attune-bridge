-- CreateEnum
CREATE TYPE "FeatureRequestStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'ACCEPTED', 'SHIPPED', 'DECLINED');

-- AlterTable
ALTER TABLE "OwnerFeatureRequest"
ADD COLUMN "status" "FeatureRequestStatus" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "OwnerFeatureRequestVote" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerFeatureRequestVote_pkey" PRIMARY KEY ("id")
);

-- DropIndex
DROP INDEX "OwnerFeatureRequest_businessId_module_createdAt_idx";

-- CreateIndex
CREATE INDEX "OwnerFeatureRequest_businessId_status_module_createdAt_idx" ON "OwnerFeatureRequest"("businessId", "status", "module", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerFeatureRequestVote_businessId_featureRequestId_createdAt_idx" ON "OwnerFeatureRequestVote"("businessId", "featureRequestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerFeatureRequestVote_featureRequestId_ownerEmail_key" ON "OwnerFeatureRequestVote"("featureRequestId", "ownerEmail");

-- AddForeignKey
ALTER TABLE "OwnerFeatureRequestVote" ADD CONSTRAINT "OwnerFeatureRequestVote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerFeatureRequestVote" ADD CONSTRAINT "OwnerFeatureRequestVote_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "OwnerFeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
