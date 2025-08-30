import { prisma,PointsActionType } from '../utils/prisma.js';

export const  getAllUserPoints = async (userId) => {
return await prisma.userPoints.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        }
      }
    });
}

export const getPointsHistory = async ({ userId, action, skip = 0, limit = 10 }) => {
  const [history, total] = await prisma.$transaction([
    prisma.pointsHistory.findMany({
      where: action && (action === 'EARNED' || action === 'SPENT')
        ? { userId, action }
        : { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            image: true,
          },
        },
        ticket: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
    }),
    prisma.pointsHistory.count({
      where: action && (action === 'EARNED' || action === 'SPENT')
        ? { userId, action }
        : { userId },
    }),
  ]);

  return { history, total };
};

export const redeemPoints = async (userId, points, redemptionId,discountAmount) => {
  const userPoints = await prisma.userPoints.findUnique({
    where: { userId },
  });

  if (!userPoints) {throw new Error('User points record not found');}
  if (userPoints.availablePoints < points) {throw new Error('Insufficient points');}

  const updatedPoints = await prisma.userPoints.update({
    where: { userId },
    data: {
      availablePoints: userPoints.availablePoints - points,
      availableDiscountAmount: userPoints.availableDiscountAmount + discountAmount,
    },
  });

  const pointsHistory = await prisma.pointsHistory.create({
    data: {
      userId,
      action: PointsActionType.SPENT,
      points: -points,
      eventId: null,
    },
  });

  return { userPoints: updatedPoints, pointsHistory };
};

export const addPoints = async (userId, points, eventId , ticketId ) => {
  try {
        const userPoints = await prisma.userPoints.update({
      where: { userId },
      data: {
        availablePoints: { increment: points },
        totalPointsEarned: { increment: points },
      },
    });
    
    const pointsHistory = await prisma.pointsHistory.create({
      data: {
        userId,
        action: PointsActionType.EARNED,
        points,
        eventId,
        ticketId,
      },
    });

    return { userPoints, pointsHistory };
  } catch (error) {
    throw new Error(`Error adding points: ${error.message}`);
  }
};

export const updateAvailableAmountDiscount  = async (userId,discountAmountLeft) => {
  return  await prisma.userPoints.update({
                where: { userId },
                data: {
                  availableDiscountAmount: discountAmountLeft
                }
              });
}

export const createUserPoints = async (userId) => {
  return await prisma.userPoints.create({
      data: {
        userId,
        availablePoints: 0,
        totalPointsEarned: 0,
        availableDiscountAmount: 0, 
      },
    });
}