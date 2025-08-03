import { prisma } from '../utils/prisma.js';

export async function createEvent(data) {
    
  const {
    title,
    category,
    description,
    image,
    ownerId,
    dates,
    pricingTiers,
  } = data;

  return prisma.events.create({
    data: {
      title,
      category,
      description,
      image,
      ownerId,
      dates: {
        create: dates.map(({ date, location }) => ({
          date: new Date(date),
          location,
        })),
      },
      pricingTiers: {
        create: pricingTiers.map(({ name, price ,capacity}) => ({
          name,
          price: parseFloat(price),
          capacity: Number(capacity),
        })),
      },
    },
    include: {
      dates: true,
      pricingTiers: true,
    },
  });
}

export async function editEvent(id, ownerId, data) {
  const { title, category, description, image, dates, pricingTiers } = data;

  return await prisma.$transaction(async (prisma) => {
    const existingEvent = await prisma.events.findFirst({
      where: { id, ownerId }
    });
    if (!existingEvent) {return null;}
    const event = await prisma.events.update({
      where: { id },
      data: {
        title,
        category,
        description,
        image,
        updatedAt: new Date()
      }
    });
    await prisma.eventDate.deleteMany({ where: { eventId: id } });
    if (dates.length > 0) {
      await prisma.eventDate.createMany({
        data: dates.map(date => ({
          date: new Date(date.date),
          location: date.location,
          eventId: id
        }))
      });
    }
    await prisma.pricingTier.deleteMany({ where: { eventId: id } });
    if (pricingTiers.length > 0) {
      await prisma.pricingTier.createMany({
        data: pricingTiers.map(tier => ({
          name: tier.name,
          price: parseFloat(tier.price),
          capacity: Number(tier.capacity),
          eventId: id
        }))
      });
    }
    return await prisma.events.findUnique({
      where: { id },
      include: {
        dates: true,
        pricingTiers: true
      }
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

export async function getAllEventByFilter(filters, pagination) {
  const page = parseInt(pagination?.page || 1, 10);
  const limit = parseInt(pagination?.limit || 10, 10);
  const skip = (page - 1) * limit;
  const take = limit;
  let { keyword, category, dateRange } = filters;

  if (typeof dateRange === 'string') {
    dateRange = dateRange.split(',');
  }

  const today = new Date();

  const where = {
    ...(keyword && {
      title: {
        contains: keyword,
        mode: 'insensitive',
      },
    }),
    ...(category && { category }),
    dates: {
      some: {
        date: {
          gte: today,
        },
        ...(dateRange && dateRange.length === 2 && {
          AND: [
            { date: { gte: new Date(dateRange[0]) } },
            { date: { lte: new Date(dateRange[1]) } },
          ],
        }),
      },
    },
  };

  const total = await prisma.events.count({ where });

  const events = await prisma.events.findMany({
    where,
    include: {
      dates: true,
      pricingTiers: true,
    },
    skip,
    take,
  });

  return {
    total,
    data: events,
  };
}

export async function getEventsByOwnerIdWithFilters(ownerId, filters, pagination) {
  const { skip = 0, take = 10 } = pagination || {};
  let { keyword, category, dateRange } = filters;

  if (typeof dateRange === 'string') {
    dateRange = dateRange.split(',');
  }

  const where = {
    ownerId,
    ...(keyword && {
      title: {
        contains: keyword,
        mode: 'insensitive',
      },
    }),
    ...(category && { category }),
    dates: {
      some: {
        ...(dateRange && dateRange.length === 2 && {
          date: {
            gte: new Date(dateRange[0]),
            lte: new Date(dateRange[1]),
          },
        }),
      },
    },
  };

  const total = await prisma.events.count({ where });

  const events = await prisma.events.findMany({
    where,
    include: {
      dates: true,
      pricingTiers: true,
    },
    skip,
    take,
  });

  return {
    total,
    data: events,
  };
}

export async function getEventById(eventId) {
  return prisma.events.findUnique({
    where: {
      id: eventId,
    },
    include: {
      dates: true,
      pricingTiers: true,
    },
  });
}

export async function getEventsByIds(eventIds) {
  return await prisma.events.findMany({
    where: { id: { in: eventIds } },
    include: {
      dates: true,
      pricingTiers: true,
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
          dates: true,
          pricingTiers: true,
        },
      },
    },
  });
}
