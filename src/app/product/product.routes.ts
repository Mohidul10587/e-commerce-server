import { Router } from "express";
import {
  getProducts, getProductBySlug, getProductById, getFreeGiftProduct,
  createProduct, updateProduct,
  moveToTrash, restoreFromTrash, permanentDeleteProduct,
  updateVariantStock, getStockHistory,
} from "./product.controller";
import { verifyUser } from "../../middleware/auth";

export const productRoutes = Router();

// Public read routes
productRoutes.get("/free-gift", getFreeGiftProduct);
productRoutes.get("/", getProducts);
productRoutes.get("/slug/:slug", getProductBySlug);
productRoutes.get("/:id", getProductById);

// Protected write routes
productRoutes.post("/", verifyUser, createProduct);
productRoutes.put("/:id", verifyUser, updateProduct);
productRoutes.delete("/:id", verifyUser, moveToTrash);
productRoutes.patch("/:id/restore", verifyUser, restoreFromTrash);
productRoutes.delete("/:id/permanent", verifyUser, permanentDeleteProduct);
productRoutes.patch("/variants/:variantId/stock", verifyUser, updateVariantStock);
productRoutes.get("/variants/:variantId/stock-history", verifyUser, getStockHistory);
