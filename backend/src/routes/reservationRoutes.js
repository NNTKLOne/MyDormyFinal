import express from 'express';
import {
  createReservation,
  getMyReservations,
  cancelReservation
} from '../controllers/reservationController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, authorize('STUDENT'), createReservation);
router.get('/my', authMiddleware, getMyReservations);
router.delete('/:id', authMiddleware, cancelReservation);

export default router;