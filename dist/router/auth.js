import { Router } from "express";
import { register, login, refreshToken, logout, getMe, getUsers, registerSchema, loginSchema, } from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
const router = Router();
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/users", protect, getUsers);
export default router;
//# sourceMappingURL=auth.js.map