import express from 'express';
import {
  getMyContracts,
  signContract
} from '../controllers/contractController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/my', authMiddleware, getMyContracts);
router.put('/:id/sign', authMiddleware, signContract);

export default router;