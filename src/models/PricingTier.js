import { prisma } from '../utils/prisma.js';

export const findTicketsById= async (tierId) => {

  return  await prisma.pricingTier.findUnique({
        where: { id: tierId },
        include: {
          _count: {
            select: { tickets: true }
          }
        }
      });
}

export const findTier = async (tierId) => {
    return await prisma.pricingTier.findUnique({
            where: { id: tierId }
          });
}

export const reduceCapacity = async (pricingTierId) => {
  return await prisma.pricingTier.update({
    where: { id: pricingTierId },
    data: {
      capacity: { decrement: 1 },
    },
  });
};