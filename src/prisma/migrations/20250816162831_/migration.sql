/*
  Warnings:

  - You are about to drop the column `eventId` on the `pricingTier` table. All the data in the column will be lost.
  - Added the required column `dateId` to the `pricingTier` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pricingTier" DROP CONSTRAINT "pricingTier_eventId_fkey";

-- AlterTable
ALTER TABLE "pricingTier" DROP COLUMN "eventId",
ADD COLUMN     "dateId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "pricingTier" ADD CONSTRAINT "pricingTier_dateId_fkey" FOREIGN KEY ("dateId") REFERENCES "eventDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
