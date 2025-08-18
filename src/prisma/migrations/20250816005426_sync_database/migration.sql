/*
  Warnings:

  - You are about to drop the column `capacity` on the `pricingTier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "eventDate" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "pricingTier" DROP COLUMN "capacity";
