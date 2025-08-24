import express from 'express';
import * as dealsController from '../controllers/dealsController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/scratch-card-eligibility', verifyToken,dealsController.checkScratchCardEligibility);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/balance', verifyToken, dealsController.getUserPoints);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/history', verifyToken, dealsController.getUserPointsHistory);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/rewards', verifyToken, dealsController.getRedemptionOptions);

// #swagger.security = [{ "cookieAuth": [] }]
router.post('/redeem/:rewardId', verifyToken, dealsController.redeemUserPoints);

// #swagger.security = [{ "cookieAuth": [] }]
router.get('/userLevel', verifyToken, dealsController.getUserLevelInfo);
export default router;