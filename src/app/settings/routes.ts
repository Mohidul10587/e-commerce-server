import { Router } from "express";
import { getSettings, updateSettings, addBanner, deleteBanner } from "./controller";

const router = Router();

router.get("/", getSettings);
router.put("/", updateSettings);
router.post("/banners", addBanner);
router.delete("/banners/:id", deleteBanner);

export { router as settingsRoutes };
