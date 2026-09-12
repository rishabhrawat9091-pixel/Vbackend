import { Router } from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getDevelopers,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../controller/task.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roles.js";
import { validateBody } from "../middleware/validation.js";
import { Role } from "@prisma/client";

const router = Router();

// Create Task - Admin & PM only
router.post(
  "/",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validateBody(createTaskSchema),
  createTask
);

// Backward-compatible alias for existing test route if needed
router.post(
  "/taskcreate",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validateBody(createTaskSchema),
  createTask
);

// List Tasks with query parameters (?status=...&priority=...&fromDueDate=...&toDueDate=...)
router.get("/", protect, getTasks);

// List Developers for task assignment
router.get(
  "/developers",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  getDevelopers
);

// Get Single Task by ID
router.get("/:taskId", protect, getTaskById);

// Update Task metadata - Admin & PM only
router.put(
  "/:taskId",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validateBody(updateTaskSchema),
  updateTask
);

// Update Task Status - Developer (for assigned task) and PM/Admin
router.patch(
  "/:taskId/status",
  protect,
  validateBody(updateTaskStatusSchema),
  updateTaskStatus
);

// Delete Task - Admin & PM only
router.delete(
  "/:taskId",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  deleteTask
);

export default router;