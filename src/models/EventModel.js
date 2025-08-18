import { prisma } from '../utils/prisma.js';

export async function createEvent(data) {
  const {
    title,
    category,
    description,
    image,
    ownerId,
    dates,
  } = data;

  return prisma.events.create({
    data: {
      title,
      category,
      description,
      image,
      ownerId,
      dates: {
        create: dates.map(({ date, location, pricingTiers }) => ({
          date: new Date(date),
          location,
          pricingTiers: {
            create: pricingTiers.map(({ name, price, capacity, refundType, refundDays, refundPercentage }) => ({
              name,
              price: parseFloat(price),
              capacity: Number(capacity),
              refundType: refundType,
              refundDays: Number(refundDays),
              refundPercentage: Number(refundPercentage),
            })),
          },
        })),
      },
    },
    include: {
      dates: {
        include: {
          pricingTiers: true,
        },
      },
    },
  });
}

export async function editEvent(id, ownerId, data) {
  const {  dates = [] } = data;

  return await prisma.$transaction(async (prisma) => {
    const existingEvent = await prisma.events.findFirst({
      where: { 
        id: id,
        ownerId: ownerId 
      },
      include: {
        dates: {
          include: { pricingTiers: true }
        }
      }
    });
    
    if (!existingEvent) {
      throw new Error('Event not found or not owned by you');
    }

    const existingDateIds = existingEvent.dates.map(d => d.id);
    const incomingDateIds = dates.map(d => d.id).filter(Boolean);
    
    const datesToDelete = existingDateIds.filter(id => !incomingDateIds.includes(id));
    if (datesToDelete.length > 0) {
      await prisma.eventDate.deleteMany({
        where: { id: { in: datesToDelete } }
      });
    }

    for (const dateData of dates) {
      if (dateData.id && existingDateIds.includes(dateData.id)) {
        await prisma.eventDate.update({
          where: { id: dateData.id },
          data: {
            date: new Date(dateData.date),
            location: dateData.location,
          }
        });
      } else {
        await prisma.eventDate.create({
          data: {
            date: new Date(dateData.date),
            location: dateData.location,
            eventId: id,
          }
        });
      }
    }

    const currentDates = await prisma.eventDate.findMany({
      where: { eventId: id }
    });

    for (const date of currentDates) {
      const dateData = dates.find(d => 
        (d.id && d.id === date.id) || 
        (!d.id && new Date(d.date).getTime() === date.date.getTime() && d.location === date.location)
      );

      if (dateData && dateData.pricingTiers) {
        const existingTiers = await prisma.pricingTier.findMany({
          where: { dateId: date.id }
        });
        const existingTierIds = existingTiers.map(t => t.id);
        const incomingTierIds = dateData.pricingTiers.map(t => t.id).filter(Boolean);

        const tiersToDelete = existingTierIds.filter(id => !incomingTierIds.includes(id));
        if (tiersToDelete.length > 0) {
          await prisma.pricingTier.deleteMany({
            where: { id: { in: tiersToDelete } }
          });
        }

        for (const tierData of dateData.pricingTiers) {
          const tierUpdateData = {
            name: tierData.name,
            price: parseFloat(tierData.price),
            capacity: Number(tierData.capacity),
            refundType: tierData.refundType,
            refundDays: tierData.refundType === 'No Refund' ? null : Number(tierData.refundDays),
            refundPercentage: tierData.refundType === 'No Refund' || tierData.refundType === 'Full Refund' 
              ? null 
              : Number(tierData.refundPercentage)
          };

          if (tierData.id && existingTierIds.includes(tierData.id)) {
            await prisma.pricingTier.update({
              where: { id: tierData.id },
              data: tierUpdateData
            });
          } else {
            await prisma.pricingTier.create({
              data: {
                ...tierUpdateData,
                dateId: date.id
              }
            });
          }
        }
      }
    }

    return await prisma.events.findUnique({
      where: { id },
      include: {
        dates: {
          include: { pricingTiers: true },
        },
      },
    });
  });
}

export async function deleteEvent(eventId, ownerId) { 
  const event = await prisma.events.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return null; 
  }

  if (event.ownerId !== ownerId) {
    throw new Error('Not authorized to delete this event');
  }
  return prisma.events.delete({
    where: { id: eventId },
  });
}

export async function getAllEventByFilter(filters, { skip, take }) {
  return prisma.events.findMany({
    where: {
      ...(filters.category && { category: filters.category }),
      ...(filters.keyword && {
        OR: [
          { title: { contains: filters.keyword, mode: 'insensitive' } },
          { description: { contains: filters.keyword, mode: 'insensitive' } },
        ]
      }),
    },
    include: {
      dates: {
        include: {
          pricingTiers: true,
        },
      },
      tickets: true,
      favorites: true,
      owner: true,
    },
    skip,
    take,
  });
}

export async function getEventsByOwnerIdWithFilters(ownerId, { keyword, category, dateRange }, { skip, take }) {
  return prisma.events.findMany({
    where: {
      ownerId,
      ...(category && { category }),
      ...(keyword && {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ]
      }),
      ...(dateRange && {
        dates: {
          some: {
            date: {
              gte: new Date(dateRange.start),
              lte: new Date(dateRange.end),
            },
          },
        },
      }),
    },
    include: {
      dates: {
        include: {
          pricingTiers: true,
        },
      },
      tickets: true,
      favorites: true,
      owner: true,
    },
    skip,
    take,
  });
}

export async function getEventById(id) {
  return prisma.events.findUnique({
    where: { id },
    include: {
      dates: {
        include: {
          pricingTiers: true,
        },
      },
      tickets: true,
      favorites: true,
      owner: true,
    },
  });
}

export async function getEventsByIds(eventIds) {
  const now = new Date();
  return await prisma.events.findMany({
    where: { 
      id: { in: eventIds },
      dates: {
        some: {
          date: { gt: now }
        }
      }
    },
    include: {
      dates: {
        include: {
          pricingTiers: true, 
        }
      },
    },
  });
}

export async function toggleEventFavorite(userId, eventId) {
  const existingFavorite = await prisma.favorite.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (existingFavorite) {
    return prisma.favorite.delete({
      where: { userId_eventId: { userId, eventId } },
    });
  } else {
    return prisma.favorite.create({
      data: {
        userId,
        eventId,
      },
    });
  }
}

export async function getFavoriteEventsByUserId(userId) {
  return await prisma.favorite.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          dates: {
            include: {
              pricingTiers: true, 
            },
          },
        },
      },
    },
  });
}

export async function getAllEventsByOwnerID(userId) {
  return await prisma.events.findMany({
    where: { ownerId: userId },
    include: {
      tickets: {
        select: {
          id: true,
          userId: true,
          tierId: true,
          createdAt: true
        }
      },
      dates: {
        include: {
          pricingTiers: {
            select: {
              id: true,
              name: true,
              price: true,
              capacity: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function countUpcomingEventsByOwnerId(ownerId) {
 const  result = await prisma.$queryRaw `
    SELECT COUNT(*) AS totalcommingEvents
      FROM events e
      JOIN "eventDate" d ON e.id = d."eventId"
       WHERE e."ownerId" = ${ownerId}
        AND d.date > CURRENT_DATE
    `; 
  const totalComingEvents = Number(result[0].totalcommingevents);
  return totalComingEvents;
}

export async function getNewArrivals() {
  const now = new Date();

  return await prisma.events.findMany({
    where: {
      dates: {
        some: {
          date: {
            gte: now,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      dates: {
        include: {
          pricingTiers: true, 
        },
      },
    },
  });
}
