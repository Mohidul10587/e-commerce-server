import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, updateOrder, updateOrderPayment, updateOrderDiscount,
  moveOrderToTrash, restoreOrder, permanentDeleteOrder, emptyOrderTrash,
  updateOrderItemSealText, addOrderItem, removeOrderItem, updateOrderItemQuantity, updateOrderItemVariant,
  bulkTrashOrders, bulkRestoreOrders, bulkUpdateOrderStatus,
  getOrderStatusCounts, getOrderPayments, deleteOrderPayment, updateOrderPaymentTx,
  assignDesigner, bulkAssignDesigner,
  getOrderForDesigner, designerSubmitDesign,
  getDesignerDashboardOrders,
} from "./order.controller";
import { verifyAdminManagerSupportDesignerOrProduction, verifyAdminManagerOrSupport, verifyAdminManagerSupportOrDesigner, verifyAdmin, verifyUser } from "../../middleware/auth";

export const orderRoutes = Router();

// Public order creation (no auth required for landing/cart/buyNow)
orderRoutes.post("/", createOrder);

// All other routes require auth
orderRoutes.use(verifyAdminManagerSupportDesignerOrProduction);

// Bulk routes (must be before /:id)
orderRoutes.post("/bulk/trash", verifyAdminManagerOrSupport, bulkTrashOrders);
orderRoutes.post("/bulk/restore", verifyAdminManagerOrSupport, bulkRestoreOrders);
orderRoutes.post("/bulk/status", verifyAdminManagerOrSupport, bulkUpdateOrderStatus);
orderRoutes.post("/bulk/assign-designer", verifyAdminManagerOrSupport, bulkAssignDesigner);

// Item-level routes
orderRoutes.patch("/items/:itemId/seal-text", verifyAdminManagerOrSupport, updateOrderItemSealText);
orderRoutes.patch("/items/:itemId/quantity", verifyAdminManagerOrSupport, updateOrderItemQuantity);
orderRoutes.patch("/items/:itemId/variant", verifyAdminManagerOrSupport, updateOrderItemVariant);
orderRoutes.delete("/items/:itemId", verifyAdminManagerOrSupport, removeOrderItem);

orderRoutes.get("/counts", getOrderStatusCounts);
orderRoutes.get("/designer/dashboard", verifyUser, getDesignerDashboardOrders);
orderRoutes.get("/", getOrders);
orderRoutes.get("/:id/designer-view", verifyUser, getOrderForDesigner);
orderRoutes.patch("/:id/designer-submit", verifyUser, designerSubmitDesign);
orderRoutes.get("/:id", getOrderById);
orderRoutes.patch("/:id/status", verifyAdminManagerOrSupport, updateOrderStatus);
orderRoutes.patch("/:id/assign-designer", verifyAdminManagerSupportOrDesigner, assignDesigner);
orderRoutes.patch("/:id/payment", verifyAdminManagerOrSupport, updateOrderPayment);
orderRoutes.get("/:id/payments", getOrderPayments);
orderRoutes.patch("/:id/payments/:txId", verifyAdminManagerOrSupport, updateOrderPaymentTx);
orderRoutes.delete("/:id/payments/:txId", verifyAdminManagerOrSupport, deleteOrderPayment);
orderRoutes.patch("/:id/discount", verifyAdminManagerOrSupport, updateOrderDiscount);
orderRoutes.post("/:id/items", verifyAdminManagerOrSupport, addOrderItem);
orderRoutes.put("/:id", verifyAdminManagerOrSupport, updateOrder);
orderRoutes.patch("/:id/restore", verifyAdminManagerOrSupport, restoreOrder);
orderRoutes.delete("/:id/permanent", verifyAdmin, permanentDeleteOrder);
orderRoutes.delete("/trash/empty", verifyAdmin, emptyOrderTrash);
orderRoutes.delete("/:id", verifyAdminManagerOrSupport, moveOrderToTrash);
