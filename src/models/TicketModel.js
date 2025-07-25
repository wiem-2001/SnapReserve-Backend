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
        tier: true,
        event: {
          include: {
            dates: true,
            owner: {
              select: {
                full_name: true,
                email: true
              }
            }
          }
        }
      }
    });
  }
export const getAllTickets = async (userId) =>{
  return await prisma.ticket.findMany({
      where: {
        userId: userId
      },
      include: {
       event: {
        include: {
          dates: true 
        }
      },
       tier: true,
    }
    });
}

export const getLastUserTicket = async (userId) => {
  return await prisma.ticket.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};
export const countFailedAttemptsForUser = async (userId, hours = 24) => {
  return await prisma.failedPaymentAttempt.count({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - hours * 60 * 60 * 1000)
      }
    }
  });
};

export const createFailedAttempt = async ({ userId, eventId, intent }) => {
  return await prisma.failedPaymentAttempt.create({
    data: {
      userId,
      eventId,
      sessionId: intent.id,
      reason: intent.last_payment_error?.message || "Unknown payment failure"
    }
  });
};
