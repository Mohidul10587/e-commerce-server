"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRoutes = void 0;
const express_1 = require("express");
const product_controller_1 = require("./product.controller");
exports.productRoutes = (0, express_1.Router)();
exports.productRoutes.get("/", product_controller_1.getProducts);
exports.productRoutes.get("/slug/:slug", product_controller_1.getProductBySlug);
exports.productRoutes.get("/:id", product_controller_1.getProductById);
exports.productRoutes.post("/", product_controller_1.createProduct);
exports.productRoutes.put("/:id", product_controller_1.updateProduct);
exports.productRoutes.delete("/:id", product_controller_1.moveToTrash);
exports.productRoutes.patch("/:id/restore", product_controller_1.restoreFromTrash);
exports.productRoutes.delete("/:id/permanent", product_controller_1.permanentDeleteProduct);
// Stock
exports.productRoutes.patch("/variants/:variantId/stock", product_controller_1.updateVariantStock);
exports.productRoutes.get("/variants/:variantId/stock-history", product_controller_1.getStockHistory);
