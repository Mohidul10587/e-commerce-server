"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.landingPageRoutes = void 0;
const express_1 = require("express");
const landingPage_controller_1 = require("./landingPage.controller");
const auth_1 = require("../../middleware/auth");
exports.landingPageRoutes = (0, express_1.Router)();
// Public
exports.landingPageRoutes.get("/slug/:slug", landingPage_controller_1.getLandingPageBySlug);
// Admin
exports.landingPageRoutes.get("/", auth_1.verifyAdmin, landingPage_controller_1.getLandingPages);
exports.landingPageRoutes.get("/trashed", auth_1.verifyAdmin, landingPage_controller_1.getTrashedLandingPages);
exports.landingPageRoutes.get("/:id", auth_1.verifyAdmin, landingPage_controller_1.getLandingPageById);
exports.landingPageRoutes.post("/", auth_1.verifyAdmin, landingPage_controller_1.createLandingPage);
exports.landingPageRoutes.put("/:id", auth_1.verifyAdmin, landingPage_controller_1.updateLandingPage);
exports.landingPageRoutes.patch("/:id/trash", auth_1.verifyAdmin, landingPage_controller_1.trashLandingPage);
exports.landingPageRoutes.patch("/:id/restore", auth_1.verifyAdmin, landingPage_controller_1.restoreLandingPage);
exports.landingPageRoutes.delete("/:id", auth_1.verifyAdmin, landingPage_controller_1.deleteLandingPage);
