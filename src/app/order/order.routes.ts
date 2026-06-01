import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, updateOrder, updateOrderPayment, updateOrderDiscount,
  moveOrderToTrash, restoreOrder, permanentDeleteOrder,
  updateOrderItemSealText, addOrderItem, removeOrderItem, updateOrderItemQuantity, updateOrderItemVariant,
  bulkTrashOrders, bulkRestoreOrders, bulkUpdateOrderStatus,
  getOrderStatusCounts,
} from "./order.controller";

export const orderRoutes = Router();

// Bulk routes (must be before /:id)
orderRoutes.post("/bulk/trash", bulkTrashOrders);
orderRoutes.post("/bulk/restore", bulkRestoreOrders);
orderRoutes.post("/bulk/status", bulkUpdateOrderStatus);

// Item-level routes (must be before /:id to avoid conflict)
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
orderRoutes.patch("/:id/discount", updateOrderDiscount);
orderRoutes.post("/:id/items", addOrderItem);
orderRoutes.put("/:id", updateOrder);
orderRoutes.delete("/:id", moveOrderToTrash);
orderRoutes.patch("/:id/restore", restoreOrder);
orderRoutes.delete("/:id/permanent", permanentDeleteOrder);
