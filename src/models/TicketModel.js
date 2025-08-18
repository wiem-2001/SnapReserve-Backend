import { prisma,RefundStatus } from '../utils/prisma.js';

export const create = async (eventId, tierId, date, userId, stripeSessionId,paymentIntentId,ticketUUID,qrImageBase64) => {
  return  prisma.ticket.create({
              data: {
                eventId,
                tierId,
                date: new Date(date),
                userId,
                stripePaymentId: paymentIntentId,
                stripeSessionId: stripeSessionId,
                uuid: ticketUUID,
                qrCodeUrl: qrImageBase64,
              },
              include: {
                tier: true,
              },
            });
            
};

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
    FROM "Ticket" t
    JOIN "pricingTier" pt ON t."tierId" = pt.id
    JOIN "eventDate" ed ON pt."dateId" = ed.id
    JOIN "events" e ON ed."eventId" = e.id
    WHERE e."ownerId" = ${ownerId}
      AND EXTRACT(YEAR FROM t."createdAt") = EXTRACT(YEAR FROM CURRENT_DATE);
  `;

  const totalEarnings = result.total_earnings;
  return totalEarnings;
};

export const countLastYearRevenue = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(pt.price), 0) AS total_earnings
    FROM "Ticket" t
    JOIN "pricingTier" pt ON t."tierId" = pt.id
    JOIN "eventDate" ed ON pt."dateId" = ed.id
    JOIN "events" e ON ed."eventId" = e.id
    WHERE e."ownerId" = ${ownerId}
      AND EXTRACT(YEAR FROM t."createdAt") = EXTRACT(YEAR FROM CURRENT_DATE) - 1;
  `;

  return result.total_earnings;
};

export const countLastMonthRevenue = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(pt.price), 0) AS total_earnings
    FROM "Ticket" t
    JOIN "pricingTier" pt ON t."tierId" = pt.id
    JOIN "eventDate" ed ON pt."dateId" = ed.id
    JOIN "events" e ON ed."eventId" = e.id
    WHERE e."ownerId" = ${ownerId}
      AND t."createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND t."createdAt" < DATE_TRUNC('month', CURRENT_DATE);
  `;
  return result.total_earnings;
};

export const countRevenueOfCurrentMonth = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(pt.price), 0) AS total_earnings
    FROM "Ticket" t
    JOIN "pricingTier" pt ON t."tierId" = pt.id
    JOIN "eventDate" ed ON pt."dateId" = ed.id
    JOIN "events" e ON ed."eventId" = e.id
    WHERE e."ownerId" = ${ownerId}
      AND t."createdAt" >= DATE_TRUNC('month', CURRENT_DATE)
      AND t."createdAt" < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  `;
  return result.total_earnings;
};

export const completionAndCancelationRate = async (ownerId) => {
  const [result] = await prisma.$queryRaw`
    SELECT 
    COUNT(*) AS total_tickets,
    COUNT(CASE WHEN t."refundStatus" = 'PROCESSED' THEN 1 END) AS cancelled_tickets,
    COUNT(CASE WHEN t."refundStatus" = 'NONE' THEN 1 END) AS completed_tickets
    FROM "Ticket" t
    JOIN "events" e ON t."eventId" = e.id
    WHERE e."ownerId" = ${ownerId};
  `;
  const formatted = {
    total_tickets: Number(result.total_tickets),
    cancelled_tickets: Number(result.cancelled_tickets),
    completed_tickets: Number(result.completed_tickets),
  };
  return formatted;
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

export const getTicketsBenMarking = async(userId) => {
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

  export const findTicket = async(ticketId) => {
    return await prisma.ticket.findUnique({
      where: { id: ticketId},
      include: { tier: true }
    });
  }

export const updatedTicketsStatus = async (ticket) => {
return  await prisma.ticket.updateMany({
        where: {
          stripePaymentId: ticket.stripePaymentId,
          id: { not: ticket.id }
        },
        data: {
          refundStatus: RefundStatus.PARTIAL_REFUND
        }
      });
}

export const findManyTickets = async (ticket) => {
  return await prisma.ticket.findMany({
      where: {
        stripePaymentId: ticket.stripePaymentId,
        userId: ticket.userId
      }
    });
}

export const updateTicket = async (ticketId, updateData) => {
  return await prisma.ticket.update({
    where: { id: ticketId },
    data: updateData
  });
}
