"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
exports.settingsRoutes = router;
router.get("/", controller_1.getSettings);
// Manager can update settings (payment methods, system, links) but not general settings (banners controlled via admin only)
router.put("/", auth_1.verifyAdminOrManager, controller_1.updateSettings);
router.post("/banners", auth_1.verifyAdmin, controller_1.addBanner);
router.delete("/banners/:id", auth_1.verifyAdmin, controller_1.deleteBanner);
// Facebook settings (Admin only)
router.get("/facebook", controller_1.getFacebookSettings);
router.post("/facebook", auth_1.verifyAdmin, controller_1.updateFacebookSettings);
// WhatsApp settings (Admin only)
router.get("/whatsapp", controller_1.getWhatsAppSettings);
router.post("/whatsapp", auth_1.verifyAdmin, controller_1.updateWhatsAppSettings);
