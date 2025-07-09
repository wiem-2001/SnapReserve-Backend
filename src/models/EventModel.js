import { prisma } from '../utils/prisma.js';

export async function createEvent(data) {
    
  const {
    title,
    category,
    description,
    image,
    maxCapacity,
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
      maxCapacity: Number(maxCapacity),
      ownerId,
      dates: {
        create: dates.map(({ date, location }) => ({
          date: new Date(date),
          location,
        })),
      },
      pricingTiers: {
        create: pricingTiers.map(({ name, price }) => ({
          name,
          price: parseFloat(price),
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
  const {
    title,
    category,
    description,
    image,
    maxCapacity,
    dates,
    pricingTiers,
  } = data;

  const existingEvent = await prisma.events.findFirst({
    where: { id, ownerId },
  });

  if (!existingEvent) {
    throw new Error('Event not found or not authorized');
  }

  const updateData = {
    title,
    category,
    description,
    image,
    maxCapacity: Number(maxCapacity),
    updatedAt: new Date(),
  };

  if (Array.isArray(dates)) {
    await prisma.eventDate.deleteMany({ where: { eventId: id } });
    updateData.dates = {
      create: dates.map(({ date, location }) => ({
        date: new Date(date),
        location,
      })),
    };
  }

  if (Array.isArray(pricingTiers)) {
    await prisma.pricingTier.deleteMany({ where: { eventId: id } });
    updateData.pricingTiers = {
      create: pricingTiers.map(({ name, price }) => ({
        name,
        price: parseFloat(price),
      })),
    };
  }

  return prisma.events.update({
    where: { id },
    data: updateData,
    include: {
      dates: true,
      pricingTiers: true,
    },
  });
}

export async function deleteEvent(eventId, ownerId) {
  return prisma.events.delete({
    where: {
      id: eventId,
      ownerId,
    },
  });
}

export async function getAllEvents() {
  return prisma.events.findMany({
    include: {
      dates: true,
      pricingTiers: true,
    },
  });
}

export async function getEventsByOwnerId(ownerId) {
  return prisma.events.findMany({
    where: { ownerId },
    include: {
      dates: true,
      pricingTiers: true,
    },
  });
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
