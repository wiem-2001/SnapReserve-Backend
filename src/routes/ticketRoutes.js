import express from 'express';
import  * as ticketController from '../controllers/ticketController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.post('/create-checkout-session', verifyToken, ticketController.createCheckoutSession);
router.get('/orders/:sessionId', verifyToken, ticketController.getOrderDetails);
router.get('/:userId', verifyToken,ticketController.getAllTicketsByUserIdGroupByCreatedDate);

export default router;
