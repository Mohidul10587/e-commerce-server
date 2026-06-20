import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  getStatusByConsignmentId,
  getStatusByInvoice,
  getStatusByTrackingCode,
  createConsignment,
} from "./steadfast.service";
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

// Manually trigger courier consignment creation for an order
export const dispatchOrder = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const courier = order.courier as any;
    if (courier?.consignment_id) {
      return res.status(409).json({ message: "Consignment already created", courier });
    }

    const invoice = `ORD-${orderId}`;
    const consignment = await createConsignment({
      invoice,
      recipient_name: order.customerName,
      recipient_phone: order.customerPhone,
      recipient_address: order.address,
      cod_amount: order.total,
      note: order.note ?? undefined,
    });

    const courierData = {
      provider: "steadfast",
      consignment_id: consignment.consignment_id,
      tracking_code: consignment.tracking_code,
      invoice: consignment.invoice,
      status: consignment.status,
      cod_amount: consignment.cod_amount,
      delivery_charge: null,
      last_update: new Date().toISOString(),
    };

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { courier: courierData },
      include: { items: true },
    });

    io.emit("order:updated", updated);
    return res.json({ message: "Consignment created", courier: courierData });
  } catch (err: any) {
    console.error("[Courier] dispatchOrder:", err.message);
    return res.status(502).json({ message: err.message });
  }
};
