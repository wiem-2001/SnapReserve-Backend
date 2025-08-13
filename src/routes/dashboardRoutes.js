import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import * as dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

router.get("/stats",verifyToken,dashboardController.stats);
router.get("/ticketBenchMarking", verifyToken, dashboardController.ticketBenMarking);
router.get("/event-performance", verifyToken, dashboardController.eventPerformance);
router.get("/topEvent",verifyToken, dashboardController.getTopEventByOwner);
export default router;
