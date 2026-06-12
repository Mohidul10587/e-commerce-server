import { Router } from "express";
import {
  getPurchases, createPurchase, updatePurchase, updatePurchaseStatus,
  movePurchaseToTrash, restorePurchase, deletePurchase, emptyPurchaseTrash,
} from "./purchase.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifyAdmin, getPurchases);
router.post("/", verifyAdmin, createPurchase);
router.put("/:id", verifyAdmin, updatePurchase);
router.patch("/:id/status", verifyAdmin, updatePurchaseStatus);
router.patch("/:id/restore", verifyAdmin, restorePurchase);
router.delete("/trash/empty", verifyAdmin, emptyPurchaseTrash);
router.delete("/:id", verifyAdmin, movePurchaseToTrash);
router.delete("/:id/permanent", verifyAdmin, deletePurchase);

export { router as purchaseRoutes };
