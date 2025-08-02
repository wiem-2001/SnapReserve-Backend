import { prisma } from '../utils/prisma.js';

export const  saveNotification = async(userId, message) =>{
  return await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });
}

export async function getAllNotifications(userId) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markNotificationAsRead(notificationId) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}