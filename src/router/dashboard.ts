import { Router } from "express";
import {
  getAdminStats,
  getPmStats,
  getDeveloperStats,
} from "../controller/dashboard.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roles.js";
import { Role } from "@prisma/client";

const router = Router();

router.get("/admin", protect, authorizeRoles(Role.ADMIN), getAdminStats);
router.get(
  "/pm",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  getPmStats
);
router.get("/developer", protect, getDeveloperStats);

export default router;
