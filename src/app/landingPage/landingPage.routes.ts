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
} from "./landingPage.controller";
import { verifyAdmin } from "../../middleware/auth";

export const landingPageRoutes = Router();

// Public
landingPageRoutes.get("/slug/:slug", getLandingPageBySlug);

// Admin
landingPageRoutes.get("/", verifyAdmin, getLandingPages);
landingPageRoutes.get("/trashed", verifyAdmin, getTrashedLandingPages);
landingPageRoutes.get("/:id", verifyAdmin, getLandingPageById);
landingPageRoutes.post("/", verifyAdmin, createLandingPage);
landingPageRoutes.put("/:id", verifyAdmin, updateLandingPage);
landingPageRoutes.patch("/:id/trash", verifyAdmin, trashLandingPage);
landingPageRoutes.patch("/:id/restore", verifyAdmin, restoreLandingPage);
landingPageRoutes.delete("/:id", verifyAdmin, deleteLandingPage);
