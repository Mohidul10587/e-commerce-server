import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  getStatusByConsignmentId,
  getStatusByInvoice,
  getStatusByTrackingCode,
} from "./steadfast.adapter";
import { submitOrderToCourier } from "./courier.dispatch";
import { io } from "../../index";

export const trackByCid = async (req: Request, res: Response) => {
  try {
    const data = await getStatusByConsignmentId(req.params.id);
    return res.json(data);
  } catch (err: any) {
    console.error("[Courier] trackByCid:", err.message);
    return res.status(502).json({ message: err.message });
  }
};

export const trackByInvoice = async (req: Request, res: Response) => {
  try {
    const data = await getStatusByInvoice(req.params.invoice);
    return res.json(data);
  } catch (err: any) {
    console.error("[Courier] trackByInvoice:", err.message);
    return res.status(502).json({ message: err.message });
  }
};

export const trackByTrackingCode = async (req: Request, res: Response) => {
  try {
    const data = await getStatusByTrackingCode(req.params.trackingCode);
    return res.json(data);
  } catch (err: any) {
    console.error("[Courier] trackByTrackingCode:", err.message);
    return res.status(502).json({ message: err.message });
  }
};

/**
 * Manually trigger courier dispatch for an order.
 * Useful if the automatic InReview dispatch failed (network error etc.).
 * Idempotent — safe to call multiple times.
 */
export const dispatchOrder = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const shipment = await submitOrderToCourier(orderId, "steadfast");

    // Re-fetch order with updated courier data
    const updated = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    io.emit("order:updated", updated);

    return res.json({ message: "Consignment created", shipment });
  } catch (err: any) {
    console.error("[Courier] dispatchOrder:", err.message);
    return res.status(502).json({ message: err.message });
  }
};

/** Get the CourierShipment record for an order */
export const getShipment = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const shipment = await prisma.courierShipment.findUnique({ where: { orderId } });
    if (!shipment) return res.status(404).json({ message: "No shipment found for this order" });
    return res.json({ shipment });
  } catch (err: any) {
    console.error("[Courier] getShipment:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
