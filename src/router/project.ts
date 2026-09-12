import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  createProjectSchema,
  updateProjectSchema,
} from "../controller/project.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roles.js";
import { validateBody } from "../middleware/validation.js";
import { Role } from "@prisma/client";

const router = Router();

// All authenticated roles can list projects (filtered in controller by role)
router.get("/", protect, getProjects);

// All authenticated roles can view project by ID (strictly guarded in controller)
router.get("/:id", protect, getProjectById);

// Only Admin and PM can create projects
router.post(
  "/",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validateBody(createProjectSchema),
  createProject
);

// Only Admin and PM can update/delete projects
router.put(
  "/:id",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validateBody(updateProjectSchema),
  updateProject
);

router.delete(
  "/:id",
  protect,
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  deleteProject
);

export default router;
