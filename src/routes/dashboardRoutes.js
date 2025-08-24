import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import * as dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

// #swagger.security = [{ "cookieAuth": [] }]
router.get("/stats",verifyToken,dashboardController.stats);

// #swagger.security = [{ "cookieAuth": [] }]
router.get("/ticketBenchMarking", verifyToken, dashboardController.ticketBenMarking);

// #swagger.security = [{ "cookieAuth": [] }]
router.get("/event-performance", verifyToken, dashboardController.eventPerformance);

// #swagger.security = [{ "cookieAuth": [] }]
router.get("/topEvent",verifyToken, dashboardController.getTopEventByOwner);
export default router;
