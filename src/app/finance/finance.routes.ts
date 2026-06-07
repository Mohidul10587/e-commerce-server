import { Router } from "express";
import { getFinancialLog } from "./finance.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/log", verifyAdmin, getFinancialLog);

export { router as financeRoutes };
