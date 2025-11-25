import express from 'express';
import { createUser } from '../controllers/adminUserController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Tik universiteto administratorius gali kurti paskyras
router.post('/users', createUser);


export default router;
