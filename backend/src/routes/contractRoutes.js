import express from 'express';
import {
  getMyContracts,
  getMyRoom,
  signContract,
  getDormAdminContracts,
  updateContractStatusByAdmin
} from '../controllers/contractController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Studentui
router.get('/my', authMiddleware, authorize('STUDENT'), getMyContracts);
router.get('/my-room', authMiddleware, authorize('STUDENT'), getMyRoom);
router.put('/:id/sign', authMiddleware, authorize('STUDENT'), signContract);

// Bendrabučio adminui
router.get('/admin', authMiddleware, authorize('DORMITORY_ADMIN'), getDormAdminContracts);
router.put('/:id/admin-status', authMiddleware, authorize('DORMITORY_ADMIN'), updateContractStatusByAdmin);

export default router;
