import { Router } from "express";
import { getSettings, updateSettings, addBanner, deleteBanner, getFacebookSettings, updateFacebookSettings, getWhatsAppSettings, updateWhatsAppSettings } from "./controller";
import { verifyAdmin, verifyAdminOrManager } from "../../middleware/auth";

const router = Router();

router.get("/", getSettings);
// Manager can update settings (payment methods, system, links) but not general settings (banners controlled via admin only)
router.put("/", verifyAdminOrManager, updateSettings);
router.post("/banners", verifyAdmin, addBanner);
router.delete("/banners/:id", verifyAdmin, deleteBanner);

// Facebook settings (Admin only)
router.get("/facebook", getFacebookSettings);
router.post("/facebook", verifyAdmin, updateFacebookSettings);

// WhatsApp settings (Admin only)
router.get("/whatsapp", getWhatsAppSettings);
router.post("/whatsapp", verifyAdmin, updateWhatsAppSettings);

export { router as settingsRoutes };
