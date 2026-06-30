import { Router } from "express";
import {
  login, signup, me, refresh, logout, changePassword,
  getUsers, createUser, updateUser,
  moveUserToTrash, restoreUser, permanentDeleteUser, emptyUserTrash,
  getDesigners,
} from "./controller";
import { verifyUser, verifyAdmin, verifyAdminOrManager, verifyAdminManagerSupportDesignerOrProduction } from "../../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/signup", signup);
router.get("/me", me);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.put("/change-password", verifyUser, changePassword);

router.get("/designers", verifyAdminManagerSupportDesignerOrProduction, getDesigners);
router.get("/", verifyAdminOrManager, getUsers);
router.post("/", verifyAdminOrManager, createUser);
router.put("/:id", verifyAdminOrManager, updateUser);
router.delete("/trash/empty", verifyAdminOrManager, emptyUserTrash);
router.delete("/:id", verifyAdminOrManager, moveUserToTrash);
router.patch("/:id/restore", verifyAdminOrManager, restoreUser);

// Permanent delete — admin only
router.delete("/:id/permanent", verifyAdmin, permanentDeleteUser);

export { router as userRoutes };
