import express from 'express';
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
} from '../controllers/roomController.js';

import { getDormitoriesList } from '../controllers/dormitoryController.js';

import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', authMiddleware, getRooms);
router.get('/dormitories', authMiddleware, getDormitoriesList);
router.get('/:id', authMiddleware, getRoom);

// Protected routes - Dormitory Admin only
router.post('/', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), createRoom);
router.put('/:id', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), updateRoom);
router.delete('/:id', authMiddleware, authorize('DORMITORY_ADMIN', 'UNIVERSITY_ADMIN'), deleteRoom);

export default router;
