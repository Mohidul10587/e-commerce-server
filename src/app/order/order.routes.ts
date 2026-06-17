import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, updateOrder, updateOrderPayment, updateOrderDiscount,
  moveOrderToTrash, restoreOrder, permanentDeleteOrder, emptyOrderTrash,
  updateOrderItemSealText, addOrderItem, removeOrderItem, updateOrderItemQuantity, updateOrderItemVariant,
  bulkTrashOrders, bulkRestoreOrders, bulkUpdateOrderStatus,
  getOrderStatusCounts, getOrderPayments, deleteOrderPayment, updateOrderPaymentTx,
} from "./order.controller";
import { verifyAdminManagerSupportDesignerOrProduction, verifyAdminManagerOrSupport, verifyAdmin } from "../../middleware/auth";

export const orderRoutes = Router();

// All 5 roles can access orders; write operations restricted to admin/manager/support/designer (not production)
orderRoutes.use(verifyAdminManagerSupportDesignerOrProduction);

// Bulk routes (must be before /:id)
orderRoutes.post("/bulk/trash", verifyAdminManagerOrSupport, bulkTrashOrders);
orderRoutes.post("/bulk/restore", verifyAdminManagerOrSupport, bulkRestoreOrders);
orderRoutes.post("/bulk/status", verifyAdminManagerOrSupport, bulkUpdateOrderStatus);

// Item-level routes
orderRoutes.patch("/items/:itemId/seal-text", verifyAdminManagerOrSupport, updateOrderItemSealText);
orderRoutes.patch("/items/:itemId/quantity", verifyAdminManagerOrSupport, updateOrderItemQuantity);
orderRoutes.patch("/items/:itemId/variant", verifyAdminManagerOrSupport, updateOrderItemVariant);
orderRoutes.delete("/items/:itemId", verifyAdminManagerOrSupport, removeOrderItem);

orderRoutes.get("/counts", getOrderStatusCounts);
orderRoutes.post("/", verifyAdminManagerOrSupport, createOrder);
orderRoutes.get("/", getOrders);
orderRoutes.get("/:id", getOrderById);
orderRoutes.patch("/:id/status", verifyAdminManagerOrSupport, updateOrderStatus);
orderRoutes.patch("/:id/payment", verifyAdminManagerOrSupport, updateOrderPayment);
orderRoutes.get("/:id/payments", getOrderPayments);
orderRoutes.patch("/:id/payments/:txId", verifyAdminManagerOrSupport, updateOrderPaymentTx);
orderRoutes.delete("/:id/payments/:txId", verifyAdminManagerOrSupport, deleteOrderPayment);
orderRoutes.patch("/:id/discount", verifyAdminManagerOrSupport, updateOrderDiscount);
orderRoutes.post("/:id/items", verifyAdminManagerOrSupport, addOrderItem);
orderRoutes.put("/:id", verifyAdminManagerOrSupport, updateOrder);
orderRoutes.delete("/trash/empty", verifyAdmin, emptyOrderTrash);
orderRoutes.delete("/:id", verifyAdminManagerOrSupport, moveOrderToTrash);
orderRoutes.patch("/:id/restore", verifyAdminManagerOrSupport, restoreOrder);
orderRoutes.delete("/:id/permanent", verifyAdmin, permanentDeleteOrder);
