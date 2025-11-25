import express from 'express';
import {
  getRooms,
  getRoom,
  getDormitories
} from '../controllers/roomController.js';

import { authMiddleware, authorize } from '../middleware/auth.js';
import { forcePasswordChange } from '../middleware/forcePasswordChange.js';

const router = express.Router();

/*
  ================================
     PROTECTED ROUTES (GET)
     Must be logged in + must NOT
     need password change
  ================================
*/

router.get('/',
    authMiddleware,
    forcePasswordChange,
    getRooms
);

router.get('/dormitories',
    authMiddleware,
    forcePasswordChange,
    getDormitories
);

router.get('/:id',
    authMiddleware,
    forcePasswordChange,
    getRoom
);

/*
  ================================
     ADMIN ROUTES
     Must be logged in + must NOT
     need password change + role OK
  ================================
*/



export default router;
