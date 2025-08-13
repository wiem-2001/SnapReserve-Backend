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

export const countTotalRevenueThisYear = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(pt.price), 0) AS total_earnings
    FROM events e
    JOIN "pricingTier" pt ON pt."eventId" = e.id
    JOIN "Ticket" t ON t."tierId" = pt.id
    WHERE e."ownerId" = ${ownerId}
      AND EXTRACT(YEAR FROM t."createdAt") = EXTRACT(YEAR FROM CURRENT_DATE);
  `;

  const totalEarnings = result.total_earnings;
  return totalEarnings;
};

export const countLastYearRevenue = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(pt.price), 0) AS total_earnings
    FROM events e
    JOIN "pricingTier" pt ON pt."eventId" = e.id
    JOIN "Ticket" t ON t."tierId" = pt.id
    WHERE e."ownerId" = ${ownerId}
      AND EXTRACT(YEAR FROM t."createdAt") = EXTRACT(YEAR FROM CURRENT_DATE) - 1;
  `;
  return result.total_earnings;
};

export const countLastMonthRevenueThisMonth = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(pt.price), 0) AS total_earnings
    FROM events e
    JOIN "pricingTier" pt ON pt."eventId" = e.id
    JOIN "Ticket" t ON t."tierId" = pt.id
    WHERE e."ownerId" = ${ownerId}
      AND t."createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND t."createdAt" < DATE_TRUNC('month', CURRENT_DATE);
  `;

  return result.total_earnings;
};

export const countRevenueOfMonthBeforeLast = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(pt.price), 0) AS total_earnings
    FROM events e
    JOIN "pricingTier" pt ON pt."eventId" = e.id
    JOIN "Ticket" t ON t."tierId" = pt.id
    WHERE e."ownerId" = ${ownerId}
      AND t."createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 month')
      AND t."createdAt" < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
  `;
  return result.total_earnings;
};

export const  repeatCount = async (userId) => {
  return  await prisma.ticket.groupBy({
  by: ['userId'],
  _count: {
    userId: true,
  },
  having: {
    userId: {
      _count: {
        gt: 1
      }
    }
  }
});
}

export async function getTicketsBenMarking(userId) {
  const now = new Date();
  const trends = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthName = start.toLocaleString('default', { month: 'short' });

    const yourTickets = await prisma.ticket.count({
      where: {
        event: {
          ownerId: userId,
        },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalTickets = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const eventCount = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        eventId: true,
      },
      distinct: ['eventId'],
    });

    const averageTickets = eventCount.length > 0
      ? totalTickets / eventCount.length
      : 0;

    trends.push({
      month: monthName,
      yourTickets,
      averageTickets,
    });
  }

  return trends;
}

export const ticketcountByEventOwnerId = async (userId) => { 
  return await prisma.ticket.count({
      where: {
        event: {
          ownerId: userId,
        },
      },
    });}