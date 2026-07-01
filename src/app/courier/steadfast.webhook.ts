/**
 * steadfast.webhook.ts
 *
 * Handles inbound webhooks from SteadFast Courier.
 * All status-to-order mapping lives here; business logic is delegated
 * to courier.dispatch.ts and the order's stock helpers.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { io } from "../../index";
import { adjustStock, syncProductStock } from "../product/product.service";
import { applyShipmentStatusUpdate } from "./courier.dispatch";
import { STEADFAST_STATUS_MAP } from "./steadfast.adapter";
import { Prisma } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const GROUP_A = new Set([
  "Processing", "WaitForDesign", "DesignSubmitted", "Revision",
  "CustomerInformed", "NeedToCall", "NoResponse", "UrgentDesign",
  "Problem", "OnHold", "NotInterested", "InProduction",
]);

export const steadfastWebhookRouter = Router();

const WEBHOOK_OK = { status: "success", message: "Webhook received successfully." };

steadfastWebhookRouter.post("/steadfast", async (req: Request, res: Response) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const token = req.headers["x-steadfast-token"] ?? req.headers["authorization"];
  if (token !== process.env.STEADFAST_WEBHOOK_TOKEN) {
    console.warn("[SteadFast Webhook] Unauthorized attempt");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const payload = req.body;

  if (!payload?.notification_type) {
    return res.status(200).json(WEBHOOK_OK);
  }

  console.log(`[SteadFast Webhook] Received: ${payload.notification_type}`, {
    consignment_id: payload.consignment_id,
    status: payload.status,
  });

  try {
    if (payload.notification_type === "delivery_status") {
      await handleDeliveryStatus(payload);
    } else if (payload.notification_type === "tracking_update") {
      await handleTrackingUpdate(payload);
    } else {
      console.log(`[SteadFast Webhook] Unhandled notification_type: ${payload.notification_type}`);
    }
  } catch (err: any) {
    console.error("[SteadFast Webhook] Processing error:", err.message);
  }

  return res.status(200).json(WEBHOOK_OK);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOrderByConsignmentId(consignmentId: number | string) {
  // First try the new CourierShipment table
  const shipment = await prisma.courierShipment.findFirst({
    where: { consignmentId: String(consignmentId) },
    include: { order: true },
  });
  if (shipment) return shipment.order;

  // Fallback: legacy courier JSON field (for orders submitted before migration)
  return prisma.order.findFirst({
    where: {
      courier: {
        path: ["consignment_id"],
        equals: Number(consignmentId),
      },
    },
  });
}

// ─── delivery_status ──────────────────────────────────────────────────────────

async function handleDeliveryStatus(payload: {
  consignment_id: number | string;
  invoice: string;
  cod_amount: number;
  status: string;
  delivery_charge: number;
  tracking_message?: string;
  updated_at: string;
}) {
  const order = await findOrderByConsignmentId(payload.consignment_id);
  if (!order) {
    console.warn(`[SteadFast Webhook] delivery_status: order not found for cid ${payload.consignment_id}`);
    return;
  }

  const mappedStatus = STEADFAST_STATUS_MAP[payload.status];
  if (!mappedStatus) {
    console.warn(`[SteadFast Webhook] Unknown courier status: "${payload.status}"`);
  }

  // Build the fields to update on Order
  const orderUpdateFields = await applyShipmentStatusUpdate({
    orderId: order.id,
    courierStatus: payload.status,
    mappedOrderStatus: mappedStatus ?? order.status,
    deliveryCharge: payload.delivery_charge ?? undefined,
    codAmount: payload.cod_amount ?? undefined,
    rawPayload: payload as unknown as Record<string, unknown>,
  });

  // Stock deduction: if order was still in Group A when courier picked it up
  const stockUpdate: Record<string, unknown> = {};
  if (mappedStatus && GROUP_A.has(order.status as string) && !order.stockDeducted) {
    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      const productIds = new Set<number>();
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { productId: true },
        });
        if (!variant) continue;
        await adjustStock(
          item.variantId, "SALE", item.quantity,
          `Order #${order.id} webhook: left Group A → ${mappedStatus}`,
          tx as any
        );
        productIds.add(variant.productId);
      }
      for (const pid of productIds) await syncProductStock(pid, tx as any);
    });
    // Include in the same order update so it's atomic with the status change
    stockUpdate.stockDeducted = true;
  }

  // Handle COD payment on delivery
  if (payload.status === "delivered") {
    await recordCodPayment(order, payload.cod_amount);
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { ...orderUpdateFields, ...stockUpdate } as any,
    include: { items: true },
  });

  io.emit("order:updated", updated);
  console.log(`[SteadFast Webhook] Order #${order.id} → ${mappedStatus ?? "no status change"}`);
}

// ─── tracking_update ──────────────────────────────────────────────────────────

async function handleTrackingUpdate(payload: {
  consignment_id: number | string;
  invoice: string;
  tracking_message: string;
  updated_at: string;
}) {
  const order = await findOrderByConsignmentId(payload.consignment_id);
  if (!order) {
    console.warn(`[SteadFast Webhook] tracking_update: order not found for cid ${payload.consignment_id}`);
    return;
  }

  // Update lastStatusPayload on CourierShipment and legacy courier JSON
  const shipment = await prisma.courierShipment.findUnique({ where: { orderId: order.id } });
  if (shipment) {
    await prisma.courierShipment.update({
      where: { orderId: order.id },
      data: {
        lastStatusPayload: payload as unknown as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    });
  }

  const existingCourier = (order.courier as Record<string, unknown>) ?? {};
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      courier: {
        ...existingCourier,
        status_message: payload.tracking_message,
        last_update: payload.updated_at ?? new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
    include: { items: true },
  });

  io.emit("order:updated", updated);
  console.log(`[SteadFast Webhook] Tracking update for order #${order.id}: ${payload.tracking_message}`);
}

// ─── COD payment helper ───────────────────────────────────────────────────────

async function recordCodPayment(order: any, codAmount: number) {
  const remaining = order.total - order.paidAmount;
  if (remaining <= 0) return;

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

  console.log(`[SteadFast Webhook] COD payment recorded for order #${order.id}: ৳${collected}`);
}
