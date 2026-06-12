import { Router } from "express";
import {
  getInventoryStats,
  getStockList,
  updateVariantInline,
  getMonthlyChartData,
  getStockMovementByDateRange,
} from "./inventory.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/stats", verifyAdmin, getInventoryStats);
router.get("/stock", verifyAdmin, getStockList);
router.get("/chart", verifyAdmin, getMonthlyChartData);
router.get("/movement", verifyAdmin, getStockMovementByDateRange);
router.patch("/variant/:id", verifyAdmin, updateVariantInline);

export { router as inventoryRoutes };
