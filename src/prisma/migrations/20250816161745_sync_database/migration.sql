/*
  Warnings:

  - You are about to drop the column `capacity` on the `eventDate` table. All the data in the column will be lost.
  - Added the required column `capacity` to the `pricingTier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "eventDate" DROP COLUMN "capacity";

-- AlterTable
ALTER TABLE "pricingTier" ADD COLUMN     "capacity" INTEGER NOT NULL;
