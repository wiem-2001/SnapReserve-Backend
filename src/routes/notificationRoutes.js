import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// #swagger.security = [{ "cookieAuth": [] }]
router.put('/:notificationId/read', verifyToken, notificationController.markNotificationAsRead);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/', verifyToken, notificationController.getNotifications);

export default router;