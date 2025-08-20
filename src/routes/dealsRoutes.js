import express from 'express';
import * as dealsController from '../controllers/dealsController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.get('/scratch-card-eligibility', verifyToken,dealsController.checkScratchCardEligibility);

export default router;