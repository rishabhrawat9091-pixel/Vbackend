import { Router } from "express";
import { getActivityFeed } from "../controller/activity.controller.js";
import { protect } from "../middleware/auth.js";
const router = Router();
// Get role-filtered activity feed (last 20 events)
router.get("/", protect, getActivityFeed);
export default router;
//# sourceMappingURL=activity.js.map