import express from 'express';
import  * as eventController from '../controllers/eventController.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { upload } from '../utils/multer.js';
const router = express.Router();

router.post('/create-event', verifyToken, upload.single('image'),eventController.createEvent);

router.put('/edit-event/:id', verifyToken,upload.single('image'), eventController.editEvent);

router.delete('/delete-event/:id', verifyToken, eventController.deleteEvent);

router.get('/getall-events', eventController.getAllEvents);

router.get('/get-events/owner', verifyToken, eventController.getEventsByOwner);

router.get('/get-event/:id', eventController.getEventById);

router.get('/recommended-events',verifyToken,eventController.getRecommendedEvents);

router.get('/get-favorite-events', verifyToken, eventController.getFavoriteEvents);

router.put('/toggle-favorite/:eventId', verifyToken, eventController.toggleEventFavorite);

export default router;
