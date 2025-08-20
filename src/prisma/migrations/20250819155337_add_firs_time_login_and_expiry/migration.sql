/*
  Warnings:

  - The values [REQUESTED,APPROVED,DENIED] on the enum `RefundStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RefundStatus_new" AS ENUM ('NONE', 'PROCESSED');
ALTER TABLE "Ticket" ALTER COLUMN "refundStatus" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "refundStatus" TYPE "RefundStatus_new" USING ("refundStatus"::text::"RefundStatus_new");
ALTER TYPE "RefundStatus" RENAME TO "RefundStatus_old";
ALTER TYPE "RefundStatus_new" RENAME TO "RefundStatus";
DROP TYPE "RefundStatus_old";
ALTER TABLE "Ticket" ALTER COLUMN "refundStatus" SET DEFAULT 'NONE';
COMMIT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "first_login_expiry" TIMESTAMP(3),
ADD COLUMN     "is_first_login" BOOLEAN NOT NULL DEFAULT true;
