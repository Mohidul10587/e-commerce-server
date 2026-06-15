import { Router } from "express";
import {
  getPurchases, createPurchase, updatePurchase, updatePurchaseStatus,
  movePurchaseToTrash, restorePurchase, deletePurchase, emptyPurchaseTrash,
} from "./purchase.controller";
import { verifyAdminOrManager } from "../../middleware/auth";

const router = Router();

router.get("/", verifyAdminOrManager, getPurchases);
router.post("/", verifyAdminOrManager, createPurchase);
router.put("/:id", verifyAdminOrManager, updatePurchase);
router.patch("/:id/status", verifyAdminOrManager, updatePurchaseStatus);
router.patch("/:id/restore", verifyAdminOrManager, restorePurchase);
router.delete("/trash/empty", verifyAdminOrManager, emptyPurchaseTrash);
router.delete("/:id", verifyAdminOrManager, movePurchaseToTrash);
router.delete("/:id/permanent", verifyAdminOrManager, deletePurchase);

export { router as purchaseRoutes };
