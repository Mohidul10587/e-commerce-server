import { Router } from "express";
import {
  getPurchases,
  createPurchase,
  updatePurchaseStatus,
  deletePurchase,
} from "./purchase.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifyAdmin, getPurchases);
router.post("/", verifyAdmin, createPurchase);
router.patch("/:id/status", verifyAdmin, updatePurchaseStatus);
router.delete("/:id", verifyAdmin, deletePurchase);

export { router as purchaseRoutes };
