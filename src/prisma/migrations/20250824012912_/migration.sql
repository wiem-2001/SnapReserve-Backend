/*
  Warnings:

  - You are about to drop the column `availableDiscount` on the `UserPoints` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserPoints" DROP COLUMN "availableDiscount",
ADD COLUMN     "availableDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
