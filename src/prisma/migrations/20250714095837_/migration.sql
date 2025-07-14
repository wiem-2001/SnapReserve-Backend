/*
  Warnings:

  - You are about to drop the column `maxCapacity` on the `events` table. All the data in the column will be lost.
  - Added the required column `capacity` to the `pricingTier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "maxCapacity";

-- AlterTable
ALTER TABLE "pricingTier" ADD COLUMN     "capacity" INTEGER NOT NULL;
