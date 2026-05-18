import { Router } from "express";
import { login, signup, me, refresh, logout, getUsers, createUser, updateUser, deleteUser, toggleActive } from "./controller";

const router = Router();

router.post("/login", login);
router.post("/signup", signup);
router.get("/me", me);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Admin user management
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.patch("/:id/toggle-active", toggleActive);

export { router as userRoutes };
