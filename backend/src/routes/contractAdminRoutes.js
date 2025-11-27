import express from "express";
import { authMiddleware, authorize } from "../middleware/auth.js";
import {
    getAllContracts,
    terminateContract,
    extendContract
} from "../controllers/contractAdminController.js";

const router = express.Router();

router.get(
    "/contracts",
    authMiddleware,
    authorize("UNIVERSITY_ADMIN"),
    getAllContracts
);

router.put(
    "/contracts/:id/terminate",
    authMiddleware,
    authorize("UNIVERSITY_ADMIN"),
    terminateContract
);

router.put(
    "/contracts/:id/extend",
    authMiddleware,
    authorize("UNIVERSITY_ADMIN"),
    extendContract
);

export default router;
