/*
  Warnings:

  - You are about to drop the column `refundRequestDate` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "refundRequestDate";

-- AlterTable
ALTER TABLE "UserPoints" ADD COLUMN     "availableDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone";
