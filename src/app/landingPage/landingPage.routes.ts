import { Router } from "express";
import {
  getLandingPages, getLandingPageBySlug, getLandingPageById,
  createLandingPage, updateLandingPage, deleteLandingPage,
} from "./landingPage.controller";
import { verifyAdmin } from "../../middleware/auth";

export const landingPageRoutes = Router();

// Public
landingPageRoutes.get("/slug/:slug", getLandingPageBySlug);

// Admin
landingPageRoutes.get("/", verifyAdmin, getLandingPages);
landingPageRoutes.get("/:id", verifyAdmin, getLandingPageById);
landingPageRoutes.post("/", verifyAdmin, createLandingPage);
landingPageRoutes.put("/:id", verifyAdmin, updateLandingPage);
landingPageRoutes.delete("/:id", verifyAdmin, deleteLandingPage);
