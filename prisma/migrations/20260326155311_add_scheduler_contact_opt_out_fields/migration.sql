-- AlterTable
ALTER TABLE "SchedulerContact" ADD COLUMN     "optedOutAt" TIMESTAMP(3),
ADD COLUMN     "optedOutReason" TEXT;
