import { Router } from "express";
import {
  getInventoryStats,
  getStockList,
  updateVariantInline,
  getMonthlyChartData,
} from "./inventory.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/stats", verifyAdmin, getInventoryStats);
router.get("/stock", verifyAdmin, getStockList);
router.get("/chart", verifyAdmin, getMonthlyChartData);
router.patch("/variant/:id", verifyAdmin, updateVariantInline);

export { router as inventoryRoutes };
