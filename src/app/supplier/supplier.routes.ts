import { Router } from "express";
import {
  getSuppliers, createSupplier, updateSupplier,
  trashSupplier, restoreSupplier, deleteSupplier, emptySupplierTrash,
} from "./supplier.controller";
import { verifyAdminOrManager } from "../../middleware/auth";

const router = Router();

router.get("/", verifyAdminOrManager, getSuppliers);
router.post("/", verifyAdminOrManager, createSupplier);
router.put("/:id", verifyAdminOrManager, updateSupplier);
router.delete("/trash/empty", verifyAdminOrManager, emptySupplierTrash);
router.delete("/:id", verifyAdminOrManager, trashSupplier);
router.patch("/:id/restore", verifyAdminOrManager, restoreSupplier);
router.delete("/:id/permanent", verifyAdminOrManager, deleteSupplier);

export { router as supplierRoutes };
