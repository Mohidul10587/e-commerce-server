import { Router } from "express";
import {
  login, signup, me, refresh, logout, changePassword,
  getUsers, createUser, updateUser,
  moveUserToTrash, restoreUser, permanentDeleteUser, emptyUserTrash,
} from "./controller";
import { verifyUser, verifyAdmin } from "../../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/signup", signup);
router.get("/me", me);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.put("/change-password", verifyUser, changePassword);

// Admin user management
router.get("/", verifyAdmin, getUsers);
router.post("/", verifyAdmin, createUser);
router.put("/:id", verifyAdmin, updateUser);
router.delete("/trash/empty", verifyAdmin, emptyUserTrash);
router.delete("/:id", verifyAdmin, moveUserToTrash);
router.patch("/:id/restore", verifyAdmin, restoreUser);
router.delete("/:id/permanent", verifyAdmin, permanentDeleteUser);

export { router as userRoutes };
