import { Router } from "express";
import {
  getInventoryStats,
  getStockList,
  updateVariantInline,
  getMonthlyChartData,
  getStockMovementByDateRange,
} from "./inventory.controller";
import { verifyAdminManagerSupportOrProduction } from "../../middleware/auth";

const router = Router();

router.get("/stats", verifyAdminManagerSupportOrProduction, getInventoryStats);
router.get("/stock", verifyAdminManagerSupportOrProduction, getStockList);
router.get("/chart", verifyAdminManagerSupportOrProduction, getMonthlyChartData);
router.get("/movement", verifyAdminManagerSupportOrProduction, getStockMovementByDateRange);
router.patch("/variant/:id", verifyAdminManagerSupportOrProduction, updateVariantInline);

export { router as inventoryRoutes };
