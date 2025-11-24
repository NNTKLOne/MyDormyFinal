import express from 'express';
import {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, authorize('UNIVERSITY_ADMIN'), createUser);
router.get('/', authMiddleware, authorize('UNIVERSITY_ADMIN', 'DORMITORY_ADMIN'), getAllUsers);
router.put('/:id', authMiddleware, authorize('UNIVERSITY_ADMIN'), updateUser);
router.delete('/:id', authMiddleware, authorize('UNIVERSITY_ADMIN'), deleteUser);

export default router;