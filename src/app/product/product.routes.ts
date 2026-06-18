import { Router } from "express";
import {
  getProducts, getProductBySlug, getProductById, getFreeGiftProduct, getInkProducts,
  createProduct, updateProduct, copyProduct,
  moveToTrash, restoreFromTrash, permanentDeleteProduct, emptyProductTrash,
  updateVariantStock, getStockHistory,
} from "./product.controller";
import { verifyUser, verifyAdmin, verifyAdminOrManager } from "../../middleware/auth";

export const productRoutes = Router();

// Public read routes
productRoutes.get("/free-gift", getFreeGiftProduct);
productRoutes.get("/inks", getInkProducts);
productRoutes.get("/", getProducts);
productRoutes.get("/slug/:slug", getProductBySlug);
productRoutes.get("/:id", getProductById);

// Protected write routes
productRoutes.post("/", verifyAdminOrManager, createProduct);
productRoutes.post("/:id/copy", verifyAdminOrManager, copyProduct);
productRoutes.put("/:id", verifyAdminOrManager, updateProduct);
productRoutes.patch("/variants/:variantId/stock", verifyAdminOrManager, updateVariantStock);
productRoutes.get("/variants/:variantId/stock-history", verifyAdminOrManager, getStockHistory);

// Admin only — delete
productRoutes.delete("/:id", verifyAdmin, moveToTrash);
productRoutes.patch("/:id/restore", verifyAdmin, restoreFromTrash);
productRoutes.delete("/:id/permanent", verifyAdmin, permanentDeleteProduct);
productRoutes.delete("/trash/empty", verifyAdmin, emptyProductTrash);
