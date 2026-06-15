import { Router } from "express";
import {
  getInventoryStats,
  getStockList,
  updateVariantInline,
  getMonthlyChartData,
  getStockMovementByDateRange,
} from "./inventory.controller";
import { verifyAdminOrManager } from "../../middleware/auth";

const router = Router();

router.get("/stats", verifyAdminOrManager, getInventoryStats);
router.get("/stock", verifyAdminOrManager, getStockList);
router.get("/chart", verifyAdminOrManager, getMonthlyChartData);
router.get("/movement", verifyAdminOrManager, getStockMovementByDateRange);
router.patch("/variant/:id", verifyAdminOrManager, updateVariantInline);

export { router as inventoryRoutes };
