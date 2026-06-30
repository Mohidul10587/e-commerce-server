import { Router } from "express";
import {
  getLandingPages,
  getTrashedLandingPages,
  getLandingPageBySlug,
  getLandingPageById,
  createLandingPage,
  updateLandingPage,
  trashLandingPage,
  restoreLandingPage,
  deleteLandingPage,
  emptyTrash,
} from "./landingPage.controller";
import { verifyAdmin, verifyAdminOrManager } from "../../middleware/auth";

export const landingPageRoutes = Router();

// Public
landingPageRoutes.get("/slug/:slug", getLandingPageBySlug);

// Admin + Manager
landingPageRoutes.get("/", verifyAdminOrManager, getLandingPages);
landingPageRoutes.get("/trashed", verifyAdminOrManager, getTrashedLandingPages);
landingPageRoutes.get("/:id", verifyAdminOrManager, getLandingPageById);
landingPageRoutes.post("/", verifyAdminOrManager, createLandingPage);
landingPageRoutes.put("/:id", verifyAdminOrManager, updateLandingPage);
landingPageRoutes.patch("/:id/trash", verifyAdminOrManager, trashLandingPage);
landingPageRoutes.patch("/:id/restore", verifyAdminOrManager, restoreLandingPage);
landingPageRoutes.delete("/trash/empty", verifyAdminOrManager, emptyTrash);

// Permanent delete — admin only
landingPageRoutes.delete("/:id", verifyAdmin, deleteLandingPage);
