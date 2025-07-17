/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uuid` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "uuid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_uuid_key" ON "Ticket"("uuid");
