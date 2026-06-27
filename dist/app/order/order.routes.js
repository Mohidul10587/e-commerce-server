"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutes = void 0;
const express_1 = require("express");
const order_controller_1 = require("./order.controller");
const auth_1 = require("../../middleware/auth");
exports.orderRoutes = (0, express_1.Router)();
// Public routes
exports.orderRoutes.post("/", order_controller_1.createOrder);
exports.orderRoutes.get("/public-stats", order_controller_1.getPublicStats);
// All other routes require auth
exports.orderRoutes.use(auth_1.verifyAdminManagerSupportDesignerOrProduction);
// Bulk routes (must be before /:id)
exports.orderRoutes.post("/bulk/trash", auth_1.verifyAdminManagerOrSupport, order_controller_1.bulkTrashOrders);
exports.orderRoutes.post("/bulk/restore", auth_1.verifyAdminManagerOrSupport, order_controller_1.bulkRestoreOrders);
exports.orderRoutes.post("/bulk/status", auth_1.verifyAdminManagerOrSupport, order_controller_1.bulkUpdateOrderStatus);
exports.orderRoutes.post("/bulk/assign-designer", auth_1.verifyAdminManagerOrSupport, order_controller_1.bulkAssignDesigner);
// Item-level routes
exports.orderRoutes.patch("/items/:itemId/seal-text", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrderItemSealText);
exports.orderRoutes.patch("/items/:itemId/quantity", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrderItemQuantity);
exports.orderRoutes.patch("/items/:itemId/variant", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrderItemVariant);
exports.orderRoutes.delete("/items/:itemId", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.removeOrderItem);
exports.orderRoutes.get("/counts", order_controller_1.getOrderStatusCounts);
exports.orderRoutes.get("/designer/dashboard", auth_1.verifyUser, order_controller_1.getDesignerDashboardOrders);
exports.orderRoutes.get("/", order_controller_1.getOrders);
exports.orderRoutes.get("/:id/designer-view", auth_1.verifyUser, order_controller_1.getOrderForDesigner);
exports.orderRoutes.patch("/:id/designer-submit", auth_1.verifyUser, order_controller_1.designerSubmitDesign);
exports.orderRoutes.get("/:id", order_controller_1.getOrderById);
exports.orderRoutes.patch("/:id/status", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrderStatus);
exports.orderRoutes.patch("/:id/assign-designer", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.assignDesigner);
exports.orderRoutes.patch("/:id/payment", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrderPayment);
exports.orderRoutes.get("/:id/payments", order_controller_1.getOrderPayments);
exports.orderRoutes.patch("/:id/payments/:txId", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrderPaymentTx);
exports.orderRoutes.delete("/:id/payments/:txId", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.deleteOrderPayment);
exports.orderRoutes.patch("/:id/discount", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrderDiscount);
exports.orderRoutes.post("/:id/items", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.addOrderItem);
exports.orderRoutes.put("/:id", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.updateOrder);
exports.orderRoutes.patch("/:id/restore", auth_1.verifyAdminManagerSupportOrDesigner, order_controller_1.restoreOrder);
exports.orderRoutes.delete("/:id/permanent", auth_1.verifyAdmin, order_controller_1.permanentDeleteOrder);
exports.orderRoutes.delete("/trash/empty", auth_1.verifyAdmin, order_controller_1.emptyOrderTrash);
exports.orderRoutes.delete("/:id", auth_1.verifyAdminManagerOrSupport, order_controller_1.moveOrderToTrash);
