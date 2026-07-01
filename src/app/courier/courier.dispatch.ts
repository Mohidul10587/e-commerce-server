/**
 * courier.dispatch.ts
 *
 * Central courier dispatch service.
 *
 * - Holds the provider registry (add new providers here only).
 * - submitOrderToCourier() is the single entry-point called by order logic.
 *   It saves to CourierShipment, keeps the legacy courier JSON in sync,
 *   and guarantees idempotency (won't submit the same order twice).
 */

import { prisma } from "../../lib/prisma";
import type { ICourierProvider, CourierProviderName, CreateShipmentInput } from "./courier.types";
import { SteadFastAdapter } from "./steadfast.adapter";
import { Prisma } from "@prisma/client";

// ─── Provider registry ────────────────────────────────────────────────────────
// To add a new courier: import its adapter and add it here.
const PROVIDERS: Record<CourierProviderName, ICourierProvider> = {
  steadfast: new SteadFastAdapter(),
  pathao:    null as any, // placeholder — implement PathaoAdapter when needed
  redx:      null as any,
  paperfly:  null as any,
};

function getProvider(name: CourierProviderName): ICourierProvider {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Courier provider "${name}" is not implemented yet.`);
  return p;
}

// ─── Main dispatch function ───────────────────────────────────────────────────

/**
 * Submit an order to the given courier provider exactly once.
 *
 * - Idempotent: if a CourierShipment already exists for this order → no-op, returns existing record.
 * - On success: creates CourierShipment row AND updates legacy Order.courier JSON.
 * - Returns the shipment record.
 */
export async function submitOrderToCourier(
  orderId: number,
  providerName: CourierProviderName = "steadfast"
) {
  // ── Idempotency check ──────────────────────────────────────────────────────
  const existing = await prisma.courierShipment.findUnique({
    where: { orderId },
  });
  if (existing) {
    console.log(
      `[Courier] Order #${orderId} already submitted to ${existing.provider} (consignment: ${existing.consignmentId}). Skipping.`
    );
    return existing;
  }

  // ── Fetch order ────────────────────────────────────────────────────────────
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  const input: CreateShipmentInput = {
    invoice: `ORD-${orderId}`,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientAddress: order.address,
    codAmount: Math.max(order.total - order.paidAmount, 0),
    note: order.note ?? undefined,
  };

  // ── Call provider ──────────────────────────────────────────────────────────
  const provider = getProvider(providerName);
  const result = await provider.createShipment(input);

  // ── Persist to CourierShipment ─────────────────────────────────────────────
  const shipment = await prisma.courierShipment.create({
    data: {
      orderId,
      provider: result.provider,
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      invoice: result.invoice,
      courierStatus: result.courierStatus,
      codAmount: result.codAmount,
      rawResponse: result.rawResponse as Prisma.InputJsonValue,
      submittedAt: new Date(),
      lastSyncAt: new Date(),
    },
  });

  // ── Keep legacy courier JSON in sync (backward compatibility) ──────────────
  await prisma.order.update({
    where: { id: orderId },
    data: {
      courier: {
        provider: result.provider,
        consignment_id: Number(result.consignmentId),
        tracking_code: result.trackingCode,
        invoice: result.invoice,
        status: result.courierStatus,
        cod_amount: result.codAmount,
        delivery_charge: null,
        last_update: new Date().toISOString(),
      },
    },
  });

  console.log(
    `[Courier] ✅ Order #${orderId} → ${result.provider} | consignment: ${result.consignmentId} | tracking: ${result.trackingCode}`
  );

  return shipment;
}

/**
 * Update the CourierShipment and Order when a webhook or status-sync arrives.
 * Called from steadfast.webhook.ts (and future provider webhooks).
 */
export async function applyShipmentStatusUpdate(params: {
  orderId: number;
  courierStatus: string;
  mappedOrderStatus: string;
  deliveryCharge?: number;
  codAmount?: number;
  rawPayload: Record<string, unknown>;
}) {
  const { orderId, courierStatus, mappedOrderStatus, deliveryCharge, codAmount, rawPayload } = params;

  const orderUpdate: Record<string, unknown> = {
    status: mappedOrderStatus,
  };

  // Update CourierShipment if it exists
  const shipment = await prisma.courierShipment.findUnique({ where: { orderId } });
  if (shipment) {
    await prisma.courierShipment.update({
      where: { orderId },
      data: {
        courierStatus,
        ...(deliveryCharge !== undefined && { deliveryCharge }),
        ...(codAmount !== undefined && { codAmount }),
        lastStatusPayload: rawPayload as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    });
  }

  // Always keep legacy courier JSON updated too
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order) {
    const existingCourier = (order.courier as Record<string, unknown>) ?? {};
    orderUpdate.courier = {
      ...existingCourier,
      status: courierStatus,
      ...(deliveryCharge !== undefined && { delivery_charge: deliveryCharge }),
      ...(codAmount !== undefined && { cod_amount: codAmount }),
      last_update: new Date().toISOString(),
    };
  }

  return orderUpdate;
}
