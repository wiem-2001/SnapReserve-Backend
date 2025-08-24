import express from 'express';
import * as dealsController from '../controllers/dealsController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.get('/scratch-card-eligibility', verifyToken,dealsController.checkScratchCardEligibility);
router.get('/balance', verifyToken, dealsController.getUserPoints);
router.get('/history', verifyToken, dealsController.getUserPointsHistory);
router.get('/rewards', verifyToken, dealsController.getRedemptionOptions);
router.post('/redeem/:rewardId', verifyToken, dealsController.redeemUserPoints);
router.get('/userLevel', verifyToken, dealsController.getUserLevelInfo);
export default router;