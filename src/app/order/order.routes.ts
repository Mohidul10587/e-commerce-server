import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, updateOrder, updateOrderPayment, updateOrderDiscount,
  moveOrderToTrash, restoreOrder, permanentDeleteOrder, emptyOrderTrash,
  updateOrderItemSealText, addOrderItem, removeOrderItem, updateOrderItemQuantity, updateOrderItemVariant,
  bulkTrashOrders, bulkRestoreOrders, bulkUpdateOrderStatus,
  getOrderStatusCounts, getPublicStats, getOrderPayments, deleteOrderPayment, updateOrderPaymentTx,
  assignDesigner, bulkAssignDesigner,
  getOrderForDesigner, designerSubmitDesign,
  getDesignerDashboardOrders,
} from "./order.controller";
import { verifyAdminManagerSupportDesignerOrProduction, verifyAdminManagerOrSupport, verifyAdminManagerSupportOrDesigner, verifyAdmin, verifyUser } from "../../middleware/auth";

export const orderRoutes = Router();

// Public routes
orderRoutes.post("/", createOrder);
orderRoutes.get("/public-stats", getPublicStats);

// All other routes require auth
orderRoutes.use(verifyAdminManagerSupportDesignerOrProduction);

// Bulk routes (must be before /:id)
orderRoutes.post("/bulk/trash", verifyAdminManagerOrSupport, bulkTrashOrders);
orderRoutes.post("/bulk/restore", verifyAdminManagerOrSupport, bulkRestoreOrders);
orderRoutes.post("/bulk/status", verifyAdminManagerOrSupport, bulkUpdateOrderStatus);
orderRoutes.post("/bulk/assign-designer", verifyAdminManagerOrSupport, bulkAssignDesigner);

// Item-level routes
orderRoutes.patch("/items/:itemId/seal-text", verifyAdminManagerSupportOrDesigner, updateOrderItemSealText);
orderRoutes.patch("/items/:itemId/quantity", verifyAdminManagerSupportOrDesigner, updateOrderItemQuantity);
orderRoutes.patch("/items/:itemId/variant", verifyAdminManagerSupportOrDesigner, updateOrderItemVariant);
orderRoutes.delete("/items/:itemId", verifyAdminManagerSupportOrDesigner, removeOrderItem);

orderRoutes.get("/counts", getOrderStatusCounts);
orderRoutes.get("/designer/dashboard", verifyUser, getDesignerDashboardOrders);
orderRoutes.get("/", getOrders);
orderRoutes.get("/:id/designer-view", verifyUser, getOrderForDesigner);
orderRoutes.patch("/:id/designer-submit", verifyUser, designerSubmitDesign);
orderRoutes.get("/:id", getOrderById);
orderRoutes.patch("/:id/status", verifyAdminManagerSupportOrDesigner, updateOrderStatus);
orderRoutes.patch("/:id/assign-designer", verifyAdminManagerSupportOrDesigner, assignDesigner);
orderRoutes.patch("/:id/payment", verifyAdminManagerSupportOrDesigner, updateOrderPayment);
orderRoutes.get("/:id/payments", getOrderPayments);
orderRoutes.patch("/:id/payments/:txId", verifyAdminManagerSupportOrDesigner, updateOrderPaymentTx);
orderRoutes.delete("/:id/payments/:txId", verifyAdminManagerSupportOrDesigner, deleteOrderPayment);
orderRoutes.patch("/:id/discount", verifyAdminManagerSupportOrDesigner, updateOrderDiscount);
orderRoutes.post("/:id/items", verifyAdminManagerSupportOrDesigner, addOrderItem);
orderRoutes.put("/:id", verifyAdminManagerSupportOrDesigner, updateOrder);
orderRoutes.patch("/:id/restore", verifyAdminManagerSupportOrDesigner, restoreOrder);
orderRoutes.delete("/:id/permanent", verifyAdmin, permanentDeleteOrder);
orderRoutes.delete("/trash/empty", verifyAdmin, emptyOrderTrash);
orderRoutes.delete("/:id", verifyAdminManagerOrSupport, moveOrderToTrash);
