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

// Protected GET routes (so req.user works!)
router.get('/', authMiddleware, getRooms);
router.get('/dormitories', authMiddleware, getDormitories);
router.get('/:id', authMiddleware, getRoom);

// Protected routes - Dormitory Admin & University Admin
router.post('/', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), createRoom);
router.put('/:id', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), updateRoom);
router.delete('/:id', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), deleteRoom);

export default router;
