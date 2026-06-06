import { Router } from "express";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  trashSupplier,
  restoreSupplier,
  deleteSupplier,
} from "./supplier.controller";
import { verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifyAdmin, getSuppliers);
router.post("/", verifyAdmin, createSupplier);
router.put("/:id", verifyAdmin, updateSupplier);
router.delete("/:id", verifyAdmin, trashSupplier);
router.patch("/:id/restore", verifyAdmin, restoreSupplier);
router.delete("/:id/permanent", verifyAdmin, deleteSupplier);

export { router as supplierRoutes };
