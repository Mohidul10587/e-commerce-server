import { Router } from "express";
import { getSettings, updateSettings, addBanner, deleteBanner } from "./controller";
import { verifyAdmin, verifyAdminOrManager } from "../../middleware/auth";

const router = Router();

router.get("/", getSettings);
// Manager can update settings (payment methods, system, links) but not general settings (banners controlled via admin only)
router.put("/", verifyAdminOrManager, updateSettings);
router.post("/banners", verifyAdmin, addBanner);
router.delete("/banners/:id", verifyAdmin, deleteBanner);

export { router as settingsRoutes };
