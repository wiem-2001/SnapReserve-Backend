import express from 'express';
import  * as ticketController from '../controllers/ticketController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// #swagger.security = [{ "cookieAuth": [] }]
router.post('/create-checkout-session', verifyToken, ticketController.createCheckoutSession);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/orders/:sessionId', verifyToken, ticketController.getOrderDetails);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/:userId', verifyToken,ticketController.getAllTicketsByUserIdGroupByCreatedDate);

// #swagger.security = [{ "cookieAuth": [] }]
router.post('/refund/:ticketId',verifyToken,ticketController.refundTicket);

export default router;
