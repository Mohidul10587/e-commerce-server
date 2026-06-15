import { Router } from "express";
import { getFinancialLog, getPurchaseCostReport } from "./finance.controller";
import { verifyAdminOrManager } from "../../middleware/auth";

const router = Router();

router.get("/log", verifyAdminOrManager, getFinancialLog);
router.get("/purchase-cost", verifyAdminOrManager, getPurchaseCostReport);

export { router as financeRoutes };
