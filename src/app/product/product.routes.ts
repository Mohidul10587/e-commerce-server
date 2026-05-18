import { Router } from "express";
import {
  getProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateVariantStock,
  getStockHistory,
} from "./product.controller";

export const productRoutes = Router();

productRoutes.get("/", getProducts);
productRoutes.get("/slug/:slug", getProductBySlug);
productRoutes.get("/:id", getProductById);
productRoutes.post("/", createProduct);
productRoutes.put("/:id", updateProduct);
productRoutes.delete("/:id", deleteProduct);

// Stock
productRoutes.patch("/variants/:variantId/stock", updateVariantStock);
productRoutes.get("/variants/:variantId/stock-history", getStockHistory);
