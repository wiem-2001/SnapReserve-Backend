-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundProcessDate" TIMESTAMP(3),
ADD COLUMN     "refundRequestDate" TIMESTAMP(3),
ADD COLUMN     "refundStatus" TEXT DEFAULT 'none';

-- AlterTable
ALTER TABLE "pricingTier" ADD COLUMN     "refundDays" INTEGER,
ADD COLUMN     "refundPercentage" INTEGER,
ADD COLUMN     "refundType" TEXT NOT NULL DEFAULT 'No Refund';
