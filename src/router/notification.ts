import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../controller/notification.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.patch("/:id/read", protect, markAsRead);
router.post("/read-all", protect, markAllAsRead);

export default router;
