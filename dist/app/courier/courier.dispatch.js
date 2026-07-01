"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitOrderToCourier = submitOrderToCourier;
exports.applyShipmentStatusUpdate = applyShipmentStatusUpdate;
const prisma_1 = require("../../lib/prisma");
const steadfast_adapter_1 = require("./steadfast.adapter");
// ─── Provider registry ────────────────────────────────────────────────────────
// To add a new courier: import its adapter and add it here.
const PROVIDERS = {
    steadfast: new steadfast_adapter_1.SteadFastAdapter(),
    pathao: null, // placeholder — implement PathaoAdapter when needed
    redx: null,
    paperfly: null,
};
function getProvider(name) {
    const p = PROVIDERS[name];
    if (!p)
        throw new Error(`Courier provider "${name}" is not implemented yet.`);
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
function submitOrderToCourier(orderId_1) {
    return __awaiter(this, arguments, void 0, function* (orderId, providerName = "steadfast") {
        var _a;
        // ── Idempotency check ──────────────────────────────────────────────────────
        const existing = yield prisma_1.prisma.courierShipment.findUnique({
            where: { orderId },
        });
        if (existing) {
            console.log(`[Courier] Order #${orderId} already submitted to ${existing.provider} (consignment: ${existing.consignmentId}). Skipping.`);
            return existing;
        }
        // ── Fetch order ────────────────────────────────────────────────────────────
        const order = yield prisma_1.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
        const input = {
            invoice: `ORD-${orderId}`,
            recipientName: order.customerName,
            recipientPhone: order.customerPhone,
            recipientAddress: order.address,
            codAmount: order.total,
            note: (_a = order.note) !== null && _a !== void 0 ? _a : undefined,
        };
        // ── Call provider ──────────────────────────────────────────────────────────
        const provider = getProvider(providerName);
        const result = yield provider.createShipment(input);
        // ── Persist to CourierShipment ─────────────────────────────────────────────
        const shipment = yield prisma_1.prisma.courierShipment.create({
            data: {
                orderId,
                provider: result.provider,
                consignmentId: result.consignmentId,
                trackingCode: result.trackingCode,
                invoice: result.invoice,
                courierStatus: result.courierStatus,
                codAmount: result.codAmount,
                rawResponse: result.rawResponse,
                submittedAt: new Date(),
                lastSyncAt: new Date(),
            },
        });
        // ── Keep legacy courier JSON in sync (backward compatibility) ──────────────
        yield prisma_1.prisma.order.update({
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
        console.log(`[Courier] ✅ Order #${orderId} → ${result.provider} | consignment: ${result.consignmentId} | tracking: ${result.trackingCode}`);
        return shipment;
    });
}
/**
 * Update the CourierShipment and Order when a webhook or status-sync arrives.
 * Called from steadfast.webhook.ts (and future provider webhooks).
 */
function applyShipmentStatusUpdate(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { orderId, courierStatus, mappedOrderStatus, deliveryCharge, codAmount, rawPayload } = params;
        const orderUpdate = {
            status: mappedOrderStatus,
        };
        // Update CourierShipment if it exists
        const shipment = yield prisma_1.prisma.courierShipment.findUnique({ where: { orderId } });
        if (shipment) {
            yield prisma_1.prisma.courierShipment.update({
                where: { orderId },
                data: Object.assign(Object.assign(Object.assign({ courierStatus }, (deliveryCharge !== undefined && { deliveryCharge })), (codAmount !== undefined && { codAmount })), { lastStatusPayload: rawPayload, lastSyncAt: new Date() }),
            });
        }
        // Always keep legacy courier JSON updated too
        const order = yield prisma_1.prisma.order.findUnique({ where: { id: orderId } });
        if (order) {
            const existingCourier = (_a = order.courier) !== null && _a !== void 0 ? _a : {};
            orderUpdate.courier = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, existingCourier), { status: courierStatus }), (deliveryCharge !== undefined && { delivery_charge: deliveryCharge })), (codAmount !== undefined && { cod_amount: codAmount })), { last_update: new Date().toISOString() });
        }
        return orderUpdate;
    });
}
