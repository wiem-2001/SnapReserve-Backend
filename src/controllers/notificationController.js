import * as notificationModel from '../models/NotificationModel.js';   

export async function saveNotification(userId, message) {
  return await notificationModel.saveNotification(userId, message);
}

export async function getNotifications(req,res) {
  const user = req.user;
  try {
    const notifications= await notificationModel.getAllNotifications(user.id);
    res.status(200).json(notifications);
  }catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markNotificationAsRead(req, res) {
  const { notificationId } = req.params;
  try {
    const updatedNotification = await notificationModel.markNotificationAsRead(notificationId);
    res.status(200).json(updatedNotification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}