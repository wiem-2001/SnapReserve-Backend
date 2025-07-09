import express from 'express';
import  * as eventController from '../controllers/eventController.js';
import { verifyToken } from '../middlewares/verifyToken.js';
const router = express.Router();

router.post('/create-event', verifyToken, eventController.createEvent);

router.put('/edit-event/:id', verifyToken, eventController.editEvent);

router.delete('/delete-event/:id', verifyToken, eventController.deleteEvent);

router.get('/getall-events/', eventController.getAllEvents);

router.get('/get-event/owner', verifyToken, eventController.getEventsByOwner);

router.get('/get-events/:id/owner', verifyToken, eventController.getEventByIdAndOwner);

export default router;
