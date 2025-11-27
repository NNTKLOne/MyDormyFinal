// routes/dormitoryRoutes.js

import express from 'express';
import { getAllDormitories } from '../controllers/dormitoryController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, authorize('UNIVERSITY_ADMIN'), getAllDormitories);

export default router;
