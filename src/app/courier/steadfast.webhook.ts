import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { io } from "../../index";

export const steadfastWebhookRouter = Router();

const WEBHOOK_OK = { status: "success", message: "Webhook received successfully." };

steadfastWebhookRouter.post("/steadfast", async (req: Request, res: Response) => {
  const payload = req.body;

  if (!payload || !payload.notification_type) {
    return res.status(200).json(WEBHOOK_OK); // respond 200 even for unknown payloads
  }

  try {
    if (payload.notification_type === "delivery_status") {
      await handleDeliveryStatus(payload);
    } else if (payload.notification_type === "tracking_update") {
      await handleTrackingUpdate(payload);
    }
  } catch (err: any) {
    console.error("[Webhook] steadfast processing error:", err.message);
  }

  return res.status(200).json(WEBHOOK_OK);
});

async function findOrderByCid(consignment_id: number | string) {
  // Prisma JSON filter for PostgreSQL jsonb
  return prisma.order.findFirst({
    where: {
      courier: {
        path: ["consignment_id"],
        equals: Number(consignment_id),
      },
    },
  });
}

async function handleDeliveryStatus(payload: {
  consignment_id: number | string;
  invoice: string;
  cod_amount: number;
  status: string;
  delivery_charge: number;
  tracking_message?: string;
  updated_at: string;
}) {
  const order = await findOrderByCid(payload.consignment_id);
  if (!order) {
    console.warn("[Webhook] delivery_status: order not found for cid", payload.consignment_id);
    return;
  }

  const existing = (order.courier as any) ?? {};

  const courierUpdate = {
    ...existing,
    status: payload.status,
    delivery_charge: payload.delivery_charge ?? existing.delivery_charge,
    cod_amount: payload.cod_amount ?? existing.cod_amount,
    last_update: payload.updated_at ?? new Date().toISOString(),
  };

  const orderUpdate: any = { courier: courierUpdate };

  if (payload.status === "delivered") {
    orderUpdate.status = "Delivered";
    // On delivery: if order has unpaid COD balance, record it as a payment transaction
    await onOrderDelivered(order, payload.cod_amount ?? existing.cod_amount);
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: orderUpdate,
    include: { items: true },
  });

  io.emit("order:updated", updated);
}

// When order is delivered: record COD collection as a payment transaction if balance remains
async function onOrderDelivered(order: any, codAmount: number) {
  const remaining = order.total - order.paidAmount;
  if (remaining <= 0) return; // already fully paid

  const collected = Math.min(codAmount, remaining);
  if (collected <= 0) return;

  const newPaid = order.paidAmount + collected;
  const paymentStatus = newPaid >= order.total ? "paid" : "partial";

  await prisma.$transaction([
    prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        amount: collected,
        source: "COD",
        note: "Collected via SteadFast delivery",
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { paidAmount: newPaid, paymentStatus, paidAt: new Date() },
    }),
  ]);
}

async function handleTrackingUpdate(payload: {
  consignment_id: number | string;
  invoice: string;
  tracking_message: string;
  updated_at: string;
}) {
  const order = await findOrderByCid(payload.consignment_id);
  if (!order) {
    console.warn("[Webhook] tracking_update: order not found for cid", payload.consignment_id);
    return;
  }

  const existing = (order.courier as any) ?? {};

  const courierUpdate = {
    ...existing,
    status_message: payload.tracking_message,
    last_update: payload.updated_at ?? new Date().toISOString(),
  };

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { courier: courierUpdate },
    include: { items: true },
  });

  io.emit("order:updated", updated);
}
