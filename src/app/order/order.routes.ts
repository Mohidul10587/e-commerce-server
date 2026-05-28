import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, updateOrder, updateOrderPayment,
  moveOrderToTrash, restoreOrder, permanentDeleteOrder,
  updateOrderItemSealText,
  bulkTrashOrders, bulkRestoreOrders, bulkUpdateOrderStatus,
} from "./order.controller";

export const orderRoutes = Router();

// Bulk routes (must be before /:id)
orderRoutes.post("/bulk/trash", bulkTrashOrders);
orderRoutes.post("/bulk/restore", bulkRestoreOrders);
orderRoutes.post("/bulk/status", bulkUpdateOrderStatus);

orderRoutes.post("/", createOrder);
orderRoutes.get("/", getOrders);
orderRoutes.get("/:id", getOrderById);
orderRoutes.patch("/:id/status", updateOrderStatus);
orderRoutes.patch("/:id/payment", updateOrderPayment);
orderRoutes.put("/:id", updateOrder);
orderRoutes.delete("/:id", moveOrderToTrash);
orderRoutes.patch("/:id/restore", restoreOrder);
orderRoutes.delete("/:id/permanent", permanentDeleteOrder);
orderRoutes.patch("/items/:itemId/seal-text", updateOrderItemSealText);
