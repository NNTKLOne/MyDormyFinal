import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getMyNotifications, markAsRead, unreadCount } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getMyNotifications);
router.put("/:id/read", authMiddleware, markAsRead);
router.get("/unread/count", authMiddleware, unreadCount);

export default router;
