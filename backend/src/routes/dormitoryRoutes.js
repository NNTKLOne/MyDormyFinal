import express from 'express';
import { getDormitoriesList } from '../controllers/dormitoryController.js';

const router = express.Router();

router.get('/', getDormitoriesList);

export default router;
