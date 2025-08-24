/*
  Warnings:

  - You are about to drop the column `points` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the column `totalEarned` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the column `totalSpent` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the column `pointsBalance` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `PointsTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserReferral` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PointsActionType" AS ENUM ('EARNED', 'SPENT');

-- DropForeignKey
ALTER TABLE "PointsTransaction" DROP CONSTRAINT "PointsTransaction_eventId_fkey";

-- DropForeignKey
ALTER TABLE "PointsTransaction" DROP CONSTRAINT "PointsTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserReferral" DROP CONSTRAINT "UserReferral_eventId_fkey";

-- DropForeignKey
ALTER TABLE "UserReferral" DROP CONSTRAINT "UserReferral_refereeId_fkey";

-- DropForeignKey
ALTER TABLE "UserReferral" DROP CONSTRAINT "UserReferral_referrerId_fkey";

-- AlterTable
ALTER TABLE "UserPoints" DROP COLUMN "points",
DROP COLUMN "totalEarned",
DROP COLUMN "totalSpent",
ADD COLUMN     "availablePoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPointsEarned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "pointsBalance";

-- DropTable
DROP TABLE "PointsTransaction";

-- DropTable
DROP TABLE "UserReferral";

-- DropEnum
DROP TYPE "PointsTransactionType";

-- DropEnum
DROP TYPE "ReferralActionType";

-- CreateTable
CREATE TABLE "PointsHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "PointsActionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "eventId" TEXT,
    "ticketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointsHistory_userId_idx" ON "PointsHistory"("userId");

-- CreateIndex
CREATE INDEX "PointsHistory_userId_action_idx" ON "PointsHistory"("userId", "action");

-- AddForeignKey
ALTER TABLE "PointsHistory" ADD CONSTRAINT "PointsHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsHistory" ADD CONSTRAINT "PointsHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsHistory" ADD CONSTRAINT "PointsHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
