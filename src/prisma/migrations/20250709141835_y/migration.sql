-- DropForeignKey
ALTER TABLE "eventDate" DROP CONSTRAINT "eventDate_eventId_fkey";

-- DropForeignKey
ALTER TABLE "pricingTier" DROP CONSTRAINT "pricingTier_eventId_fkey";

-- AddForeignKey
ALTER TABLE "eventDate" ADD CONSTRAINT "eventDate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricingTier" ADD CONSTRAINT "pricingTier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
