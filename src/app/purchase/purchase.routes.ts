import { Router } from "express";
import {
  getPurchases,
  createPurchase,
  updatePurchaseStatus,
  movePurchaseToTrash,
  restorePurchase,
  deletePurchase,
} from "./purchase.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifyAdmin, getPurchases);
router.post("/", verifyAdmin, createPurchase);
router.patch("/:id/status", verifyAdmin, updatePurchaseStatus);
router.patch("/:id/restore", verifyAdmin, restorePurchase);
router.delete("/:id", verifyAdmin, movePurchaseToTrash);
router.delete("/:id/permanent", verifyAdmin, deletePurchase);

export { router as purchaseRoutes };
