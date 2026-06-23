import { Router } from "express";
import { getSettings, updateSettings, addBanner, deleteBanner } from "./controller";
import { verifyAdmin, verifyAdminOrManager } from "../../middleware/auth";

const router = Router();

router.get("/", getSettings);
router.put("/", verifyAdminOrManager, updateSettings);
router.post("/banners", verifyAdmin, addBanner);
router.delete("/banners/:id", verifyAdmin, deleteBanner);

export { router as settingsRoutes };
