"use strict";
/**
 * steadfast.webhook.ts
 *
 * Handles inbound webhooks from SteadFast Courier.
 * All status-to-order mapping lives here; business logic is delegated
 * to courier.dispatch.ts and the order's stock helpers.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.steadfastWebhookRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const index_1 = require("../../index");
const product_service_1 = require("../product/product.service");
const courier_dispatch_1 = require("./courier.dispatch");
const steadfast_adapter_1 = require("./steadfast.adapter");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const GROUP_A = new Set([
    "Processing", "WaitForDesign", "DesignSubmitted", "Revision",
    "CustomerInformed", "NeedToCall", "NoResponse", "UrgentDesign",
    "Problem", "OnHold", "NotInterested", "InProduction",
]);
exports.steadfastWebhookRouter = (0, express_1.Router)();
const WEBHOOK_OK = { status: "success", message: "Webhook received successfully." };
exports.steadfastWebhookRouter.post("/steadfast", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // ── Auth ────────────────────────────────────────────────────────────────────
    const token = (_a = req.headers["x-steadfast-token"]) !== null && _a !== void 0 ? _a : req.headers["authorization"];
    if (token !== process.env.STEADFAST_WEBHOOK_TOKEN) {
        console.warn("[SteadFast Webhook] Unauthorized attempt");
        return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = req.body;
    if (!(payload === null || payload === void 0 ? void 0 : payload.notification_type)) {
        return res.status(200).json(WEBHOOK_OK);
    }
    console.log(`[SteadFast Webhook] Received: ${payload.notification_type}`, {
        consignment_id: payload.consignment_id,
        status: payload.status,
    });
    try {
        if (payload.notification_type === "delivery_status") {
            yield handleDeliveryStatus(payload);
        }
        else if (payload.notification_type === "tracking_update") {
            yield handleTrackingUpdate(payload);
        }
        else {
            console.log(`[SteadFast Webhook] Unhandled notification_type: ${payload.notification_type}`);
        }
    }
    catch (err) {
        console.error("[SteadFast Webhook] Processing error:", err.message);
    }
    return res.status(200).json(WEBHOOK_OK);
}));
// ─── Helpers ──────────────────────────────────────────────────────────────────
function findOrderByConsignmentId(consignmentId) {
    return __awaiter(this, void 0, void 0, function* () {
        // First try the new CourierShipment table
        const shipment = yield prisma_1.prisma.courierShipment.findFirst({
            where: { consignmentId: String(consignmentId) },
            include: { order: true },
        });
        if (shipment)
            return shipment.order;
        // Fallback: legacy courier JSON field (for orders submitted before migration)
        return prisma_1.prisma.order.findFirst({
            where: {
                courier: {
                    path: ["consignment_id"],
                    equals: Number(consignmentId),
                },
            },
        });
    });
}
// ─── delivery_status ──────────────────────────────────────────────────────────
function handleDeliveryStatus(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const order = yield findOrderByConsignmentId(payload.consignment_id);
        if (!order) {
            console.warn(`[SteadFast Webhook] delivery_status: order not found for cid ${payload.consignment_id}`);
            return;
        }
        const mappedStatus = steadfast_adapter_1.STEADFAST_STATUS_MAP[payload.status];
        if (!mappedStatus) {
            console.warn(`[SteadFast Webhook] Unknown courier status: "${payload.status}"`);
        }
        // Build the fields to update on Order
        const orderUpdateFields = yield (0, courier_dispatch_1.applyShipmentStatusUpdate)({
            orderId: order.id,
            courierStatus: payload.status,
            mappedOrderStatus: mappedStatus !== null && mappedStatus !== void 0 ? mappedStatus : order.status,
            deliveryCharge: (_a = payload.delivery_charge) !== null && _a !== void 0 ? _a : undefined,
            codAmount: (_b = payload.cod_amount) !== null && _b !== void 0 ? _b : undefined,
            rawPayload: payload,
        });
        // Stock deduction: if order was still in Group A when courier picked it up
        const stockUpdate = {};
        if (mappedStatus && GROUP_A.has(order.status) && !order.stockDeducted) {
            yield prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const items = yield tx.orderItem.findMany({ where: { orderId: order.id } });
                const productIds = new Set();
                for (const item of items) {
                    const variant = yield tx.productVariant.findUnique({
                        where: { id: item.variantId },
                        select: { productId: true },
                    });
                    if (!variant)
                        continue;
                    yield (0, product_service_1.adjustStock)(item.variantId, "SALE", item.quantity, `Order #${order.id} webhook: left Group A → ${mappedStatus}`, tx);
                    productIds.add(variant.productId);
                }
                for (const pid of productIds)
                    yield (0, product_service_1.syncProductStock)(pid, tx);
            }));
            // Include in the same order update so it's atomic with the status change
            stockUpdate.stockDeducted = true;
        }
        // Handle COD payment on delivery
        if (payload.status === "delivered") {
            yield recordCodPayment(order, payload.cod_amount);
        }
        const updated = yield prisma_1.prisma.order.update({
            where: { id: order.id },
            data: Object.assign(Object.assign({}, orderUpdateFields), stockUpdate),
            include: { items: true },
        });
        index_1.io.emit("order:updated", updated);
        console.log(`[SteadFast Webhook] Order #${order.id} → ${mappedStatus !== null && mappedStatus !== void 0 ? mappedStatus : "no status change"}`);
    });
}
// ─── tracking_update ──────────────────────────────────────────────────────────
function handleTrackingUpdate(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const order = yield findOrderByConsignmentId(payload.consignment_id);
        if (!order) {
            console.warn(`[SteadFast Webhook] tracking_update: order not found for cid ${payload.consignment_id}`);
            return;
        }
        // Update lastStatusPayload on CourierShipment and legacy courier JSON
        const shipment = yield prisma_1.prisma.courierShipment.findUnique({ where: { orderId: order.id } });
        if (shipment) {
            yield prisma_1.prisma.courierShipment.update({
                where: { orderId: order.id },
                data: {
                    lastStatusPayload: payload,
                    lastSyncAt: new Date(),
                },
            });
        }
        const existingCourier = (_a = order.courier) !== null && _a !== void 0 ? _a : {};
        const updated = yield prisma_1.prisma.order.update({
            where: { id: order.id },
            data: {
                courier: Object.assign(Object.assign({}, existingCourier), { status_message: payload.tracking_message, last_update: (_b = payload.updated_at) !== null && _b !== void 0 ? _b : new Date().toISOString() }),
            },
            include: { items: true },
        });
        index_1.io.emit("order:updated", updated);
        console.log(`[SteadFast Webhook] Tracking update for order #${order.id}: ${payload.tracking_message}`);
    });
}
// ─── COD payment helper ───────────────────────────────────────────────────────
function recordCodPayment(order, codAmount) {
    return __awaiter(this, void 0, void 0, function* () {
        const remaining = order.total - order.paidAmount;
        if (remaining <= 0)
            return;
        const collected = Math.min(codAmount, remaining);
        if (collected <= 0)
            return;
        const newPaid = order.paidAmount + collected;
        const paymentStatus = newPaid >= order.total ? "paid" : "partial";
        yield prisma_1.prisma.$transaction([
            prisma_1.prisma.paymentTransaction.create({
                data: {
                    orderId: order.id,
                    amount: collected,
                    source: "COD",
                    note: "Collected via SteadFast delivery",
                },
            }),
            prisma_1.prisma.order.update({
                where: { id: order.id },
                data: { paidAmount: newPaid, paymentStatus, paidAt: new Date() },
            }),
        ]);
        console.log(`[SteadFast Webhook] COD payment recorded for order #${order.id}: ৳${collected}`);
    });
}
