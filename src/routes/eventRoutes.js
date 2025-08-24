import express from 'express';
import  * as eventController from '../controllers/eventController.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { upload } from '../utils/multer.js';
const router = express.Router();

// #swagger.security = [{ "cookieAuth": [] }]
router.post('/create-event', verifyToken, upload.single('image'),eventController.createEvent);

// #swagger.security = [{ "cookieAuth": [] }]
router.put('/edit-event/:id', verifyToken,upload.single('image'), eventController.editEvent);

// #swagger.security = [{ "cookieAuth": [] }]
router.delete('/delete-event/:id', verifyToken, eventController.deleteEvent);

router.get('/getall-events', eventController.getAllEvents);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/get-events/owner', verifyToken, eventController.getEventsByOwner);

router.get('/get-event/:id', eventController.getEventById);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/recommended-events',verifyToken,eventController.getRecommendedEvents);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/get-favorite-events', verifyToken, eventController.getFavoriteEvents);

// #swagger.security = [{ "cookieAuth": [] }]
router.put('/toggle-favorite/:eventId', verifyToken, eventController.toggleEventFavorite);

export default router;
