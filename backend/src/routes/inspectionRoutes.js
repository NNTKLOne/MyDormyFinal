import express from 'express';
import {
  createInspection,
  getSupervisorInspections,
  updateInspectionStatus,
  setResidentAttendance,
  getMyUpcomingVisits,
  getMyInspections
} from '../controllers/inspectionController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Studentas kuria apžiūros užklausą
router.post('/', authMiddleware, authorize('STUDENT'), createInspection);

// Studentas mato savo pateiktas apžiūras (visos būsenos: PENDING/APPROVED/REJECTED/CANCELED)
router.get('/my', authMiddleware, authorize('STUDENT'), getMyInspections);

// Budėtojas mato visas laukiančias užklausas
router.get('/supervisor', authMiddleware, authorize('SUPERVISOR'), getSupervisorInspections);

// ČIA svarbu: neberibojam tik SUPERVISOR – teises tikrina pats controller
router.put('/:id/status', authMiddleware, updateInspectionStatus);

// Gyventojas nurodo, ar bus kambaryje
router.put('/:id/attendance', authMiddleware, setResidentAttendance);

// Gyventojas mato būsimus apsilankymus į jo kambarį
router.get('/my-visits', authMiddleware, getMyUpcomingVisits);

export default router;
