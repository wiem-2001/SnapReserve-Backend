-- DropForeignKey
ALTER TABLE "SuspiciousActivity" DROP CONSTRAINT "SuspiciousActivity_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserDevice" DROP CONSTRAINT "UserDevice_userId_fkey";

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspiciousActivity" ADD CONSTRAINT "SuspiciousActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
