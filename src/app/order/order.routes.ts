import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, updateOrder,
  moveOrderToTrash, restoreOrder, permanentDeleteOrder,
  updateOrderItemSealText,
} from "./order.controller";

export const orderRoutes = Router();

orderRoutes.post("/", createOrder);
orderRoutes.get("/", getOrders);
orderRoutes.get("/:id", getOrderById);
orderRoutes.patch("/:id/status", updateOrderStatus);
orderRoutes.put("/:id", updateOrder);
orderRoutes.delete("/:id", moveOrderToTrash);
orderRoutes.patch("/:id/restore", restoreOrder);
orderRoutes.delete("/:id/permanent", permanentDeleteOrder);
orderRoutes.patch("/items/:itemId/seal-text", updateOrderItemSealText);
