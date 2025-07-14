import { prisma } from '../utils/prisma.js';

export const create = async (eventId, tierId, date, userId, stripeSessionId) => {
  return prisma.ticket.create({
    data: {
      eventId,
      tierId,
      date: new Date(date),
      userId,
      stripeSessionId,
    },
  });
};

export const findOneTicket = async (tierId) => {
  return await prisma.pricingTier.findUnique({ where: { id: tierId } });
}

export const findTicketsBySessionId =async (sessionId) => {
    return await prisma.ticket.findMany({
      where: {
        stripeSessionId: sessionId,
      },
      include: {
        tier: true,
        event: true,
      },
    });
}