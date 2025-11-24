import express from 'express';
import {
  submitRequest,
  getAllRequests,
  getMyRequests,
  updateRequestStatus
} from '../controllers/requestController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, authorize('STUDENT'), submitRequest);
router.get('/', authMiddleware, authorize('UNIVERSITY_ADMIN'), getAllRequests);
router.get('/my', authMiddleware, getMyRequests);
router.put('/:id/status', authMiddleware, authorize('UNIVERSITY_ADMIN'), updateRequestStatus);

export default router;