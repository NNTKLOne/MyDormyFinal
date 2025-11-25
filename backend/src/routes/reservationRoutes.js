import express from 'express';
import { createReservation } from '../controllers/reservationController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import {forcePasswordChange} from "../middleware/forcePasswordChange.js";

const router = express.Router();

router.post('/', authorize('STUDENT'), createReservation);

export default router;