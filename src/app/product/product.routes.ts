import { Router } from "express";
import {
  getProducts, getProductBySlug, getProductById,
  createProduct, updateProduct,
  moveToTrash, restoreFromTrash, permanentDeleteProduct,
  updateVariantStock, getStockHistory,
} from "./product.controller";

export const productRoutes = Router();

productRoutes.get("/", getProducts);
productRoutes.get("/slug/:slug", getProductBySlug);
productRoutes.get("/:id", getProductById);
productRoutes.post("/", createProduct);
productRoutes.put("/:id", updateProduct);
productRoutes.delete("/:id", moveToTrash);
productRoutes.patch("/:id/restore", restoreFromTrash);
productRoutes.delete("/:id/permanent", permanentDeleteProduct);

// Stock
productRoutes.patch("/variants/:variantId/stock", updateVariantStock);
productRoutes.get("/variants/:variantId/stock-history", getStockHistory);
