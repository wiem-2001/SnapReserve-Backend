/*
  Warnings:

  - The `refundStatus` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `refundType` column on the `pricingTier` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'DENIED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('NO_REFUND', 'FULL_REFUND', 'PARTIAL_REFUND');

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "refundStatus",
ADD COLUMN     "refundStatus" "RefundStatus" DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "pricingTier" DROP COLUMN "refundType",
ADD COLUMN     "refundType" "RefundType" NOT NULL DEFAULT 'NO_REFUND';
