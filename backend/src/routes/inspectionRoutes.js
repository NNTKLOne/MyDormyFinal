import express from 'express';
import {
  createInspection,
  getSupervisorInspections,
  updateInspectionStatus,
  setResidentAttendance,
  getMyUpcomingVisits
} from '../controllers/inspectionController.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, authorize('STUDENT'), createInspection);
router.get('/supervisor', authMiddleware, authorize('SUPERVISOR'), getSupervisorInspections);
router.put('/:id/status', authMiddleware, authorize('SUPERVISOR'), updateInspectionStatus);
router.put('/:id/attendance', authMiddleware, setResidentAttendance);
router.get('/my-visits', authMiddleware, getMyUpcomingVisits);

export default router;