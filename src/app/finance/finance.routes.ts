import { Router } from "express";
import { getFinancialLog, getPurchaseCostReport } from "./finance.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/log", verifyAdmin, getFinancialLog);
router.get("/purchase-cost", verifyAdmin, getPurchaseCostReport);

export { router as financeRoutes };
