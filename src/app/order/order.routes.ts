import { Router } from "express";
import { createOrder, getOrders, getOrderById, updateOrderStatus } from "./order.controller";

export const orderRoutes = Router();

orderRoutes.post("/", createOrder);
orderRoutes.get("/", getOrders);
orderRoutes.get("/:id", getOrderById);
orderRoutes.patch("/:id/status", updateOrderStatus);
