-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_tierId_fkey";

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "pricingTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
