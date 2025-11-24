import express from 'express';
import { createReservation } from '../controllers/reservationController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, authorize('STUDENT'), createReservation);

export default router;