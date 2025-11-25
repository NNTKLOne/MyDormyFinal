import express from 'express';
import {
  getMyContracts,
  getMyRoom,
  signContract
} from '../controllers/contractController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/my', authMiddleware, getMyContracts);
router.get('/my-room', authMiddleware, getMyRoom);
router.put('/:id/sign', authMiddleware, signContract);

export default router;
