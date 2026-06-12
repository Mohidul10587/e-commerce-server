"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRoutes = void 0;
const express_1 = require("express");
const product_controller_1 = require("./product.controller");
const auth_1 = require("../../middleware/auth");
exports.productRoutes = (0, express_1.Router)();
// Public read routes
exports.productRoutes.get("/free-gift", product_controller_1.getFreeGiftProduct);
exports.productRoutes.get("/inks", product_controller_1.getInkProducts);
exports.productRoutes.get("/", product_controller_1.getProducts);
exports.productRoutes.get("/slug/:slug", product_controller_1.getProductBySlug);
exports.productRoutes.get("/:id", product_controller_1.getProductById);
// Protected write routes
exports.productRoutes.post("/", auth_1.verifyUser, product_controller_1.createProduct);
exports.productRoutes.put("/:id", auth_1.verifyUser, product_controller_1.updateProduct);
exports.productRoutes.delete("/:id", auth_1.verifyUser, product_controller_1.moveToTrash);
exports.productRoutes.patch("/:id/restore", auth_1.verifyUser, product_controller_1.restoreFromTrash);
exports.productRoutes.delete("/:id/permanent", auth_1.verifyUser, product_controller_1.permanentDeleteProduct);
exports.productRoutes.delete("/trash/empty", auth_1.verifyUser, product_controller_1.emptyProductTrash);
exports.productRoutes.patch("/variants/:variantId/stock", auth_1.verifyUser, product_controller_1.updateVariantStock);
exports.productRoutes.get("/variants/:variantId/stock-history", auth_1.verifyUser, product_controller_1.getStockHistory);
