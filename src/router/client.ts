import { Router } from "express";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  clientSchema,
} from "../controller/client.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roles.js";
import { validateBody } from "../middleware/validation.js";
import { Role } from "@prisma/client";

const router = Router();

// Admin and PM can view clients
router.get("/", protect, authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER), getClients);

// Only Admin can create, update, delete clients
router.post(
  "/",
  protect,
  authorizeRoles(Role.ADMIN),
  validateBody(clientSchema),
  createClient
);

router.put(
  "/:id",
  protect,
  authorizeRoles(Role.ADMIN),
  validateBody(clientSchema.partial()),
  updateClient
);

router.delete("/:id", protect, authorizeRoles(Role.ADMIN), deleteClient);

export default router;
