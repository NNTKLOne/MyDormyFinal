import express from 'express';
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getDormitories
} from '../controllers/roomController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getRooms);
router.get('/dormitories', getDormitories);
router.get('/:id', getRoom);

// Protected routes - Dormitory Admin only
router.post('/', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), createRoom);
router.put('/:id', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), updateRoom);
router.delete('/:id', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), deleteRoom);

export default router;
