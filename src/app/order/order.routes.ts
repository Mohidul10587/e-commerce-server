import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, updateOrder, updateOrderPayment, updateOrderDiscount,
  moveOrderToTrash, restoreOrder, permanentDeleteOrder, emptyOrderTrash,
  updateOrderItemSealText, addOrderItem, removeOrderItem, updateOrderItemQuantity, updateOrderItemVariant,
  bulkTrashOrders, bulkRestoreOrders, bulkUpdateOrderStatus,
  getOrderStatusCounts, getOrderPayments, deleteOrderPayment, updateOrderPaymentTx,
} from "./order.controller";
import { verifyAdminManagerOrSupport } from "../../middleware/auth";

export const orderRoutes = Router();

orderRoutes.use(verifyAdminManagerOrSupport);

// Bulk routes (must be before /:id)
orderRoutes.post("/bulk/trash", bulkTrashOrders);
orderRoutes.post("/bulk/restore", bulkRestoreOrders);
orderRoutes.post("/bulk/status", bulkUpdateOrderStatus);

// Item-level routes
orderRoutes.patch("/items/:itemId/seal-text", updateOrderItemSealText);
orderRoutes.patch("/items/:itemId/quantity", updateOrderItemQuantity);
orderRoutes.patch("/items/:itemId/variant", updateOrderItemVariant);
orderRoutes.delete("/items/:itemId", removeOrderItem);

orderRoutes.get("/counts", getOrderStatusCounts);
orderRoutes.post("/", createOrder);
orderRoutes.get("/", getOrders);
orderRoutes.get("/:id", getOrderById);
orderRoutes.patch("/:id/status", updateOrderStatus);
orderRoutes.patch("/:id/payment", updateOrderPayment);
orderRoutes.get("/:id/payments", getOrderPayments);
orderRoutes.patch("/:id/payments/:txId", updateOrderPaymentTx);
orderRoutes.delete("/:id/payments/:txId", deleteOrderPayment);
orderRoutes.patch("/:id/discount", updateOrderDiscount);
orderRoutes.post("/:id/items", addOrderItem);
orderRoutes.put("/:id", updateOrder);
orderRoutes.delete("/trash/empty", emptyOrderTrash);
orderRoutes.delete("/:id", moveOrderToTrash);
orderRoutes.patch("/:id/restore", restoreOrder);
orderRoutes.delete("/:id/permanent", permanentDeleteOrder);
