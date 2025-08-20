/*
  Warnings:

  - You are about to drop the column `first_login_expiry` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_first_login` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "first_login_expiry",
DROP COLUMN "is_first_login",
ADD COLUMN     "first_login_gift" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "welcome_gift_expiry" TIMESTAMP(3);
