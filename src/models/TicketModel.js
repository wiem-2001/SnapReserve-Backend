import { prisma } from '../utils/prisma.js';

export const create = async (eventId, tierId, date, userId, stripeSessionId,ticketUUID,qrImageBase64) => {
  return  prisma.ticket.create({
              data: {
                eventId,
                tierId,
                date: new Date(date),
                userId,
                stripeSessionId: stripeSessionId,
                uuid: ticketUUID,
                qrCodeUrl: qrImageBase64,
              },
              include: {
                tier: true,
              },
            });
            
};

export const findOneTicket = async (tierId) => {
  return await prisma.pricingTier.findUnique({ where: { id: tierId } });
}

export const findTicketsBySessionId =async (sessionId,userId) => {
    return await prisma.ticket.findMany({
    where: {
      stripeSessionId: sessionId,
      userId: userId
    },
    include: {
      tier: true
    }
  });
}