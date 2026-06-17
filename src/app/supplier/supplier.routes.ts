import { Router } from "express";
import {
  getSuppliers, createSupplier, updateSupplier,
  trashSupplier, restoreSupplier, deleteSupplier, emptySupplierTrash,
} from "./supplier.controller";
import { verifyAdminOrManager, verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifyAdminOrManager, getSuppliers);
router.post("/", verifyAdminOrManager, createSupplier);
router.put("/:id", verifyAdminOrManager, updateSupplier);
router.delete("/trash/empty", verifyAdmin, emptySupplierTrash);
router.delete("/:id", verifyAdminOrManager, trashSupplier);
router.patch("/:id/restore", verifyAdminOrManager, restoreSupplier);
router.delete("/:id/permanent", verifyAdmin, deleteSupplier);

export { router as supplierRoutes };
