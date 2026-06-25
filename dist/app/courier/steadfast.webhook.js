"use strict";
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
const dotenv_1 = __importDefault(require("dotenv"));
const GROUP_A = new Set([
    "Processing", "WaitForDesign", "DesignSubmitted", "Revision",
    "CustomerInformed", "NeedToCall", "NoResponse", "UrgentDesign",
    "Problem", "OnHold", "NotInterested", "InProduction",
]);
dotenv_1.default.config();
exports.steadfastWebhookRouter = (0, express_1.Router)();
const WEBHOOK_OK = {
    status: "success",
    message: "Webhook received successfully.",
};
exports.steadfastWebhookRouter.post("/steadfast", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers["x-steadfast-token"]) !== null && _a !== void 0 ? _a : req.headers["authorization"];
    if (token !== process.env.STEADFAST_WEBHOOK_TOKEN) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = req.body;
    if (!payload || !payload.notification_type) {
        return res.status(200).json(WEBHOOK_OK);
    }
    try {
        if (payload.notification_type === "delivery_status") {
            yield handleDeliveryStatus(payload);
        }
        else if (payload.notification_type === "tracking_update") {
            yield handleTrackingUpdate(payload);
        }
    }
    catch (err) {
        console.error("[Webhook] steadfast processing error:", err.message);
    }
    return res.status(200).json(WEBHOOK_OK);
}));
function findOrderByCid(consignment_id) {
    return __awaiter(this, void 0, void 0, function* () {
        // Prisma JSON filter for PostgreSQL jsonb
        return prisma_1.prisma.order.findFirst({
            where: {
                courier: {
                    path: ["consignment_id"],
                    equals: Number(consignment_id),
                },
            },
        });
    });
}
function handleDeliveryStatus(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const order = yield findOrderByCid(payload.consignment_id);
        if (!order) {
            console.warn("[Webhook] delivery_status: order not found for cid", payload.consignment_id);
            return;
        }
        const existing = (_a = order.courier) !== null && _a !== void 0 ? _a : {};
        const courierUpdate = Object.assign(Object.assign({}, existing), { status: payload.status, delivery_charge: (_b = payload.delivery_charge) !== null && _b !== void 0 ? _b : existing.delivery_charge, cod_amount: (_c = payload.cod_amount) !== null && _c !== void 0 ? _c : existing.cod_amount, last_update: (_d = payload.updated_at) !== null && _d !== void 0 ? _d : new Date().toISOString() });
        const orderUpdate = { courier: courierUpdate };
        const statusMap = {
            in_review: "InReview",
            pending: "Pending",
            delivered: "Delivered",
            partial_delivered: "PartlyDelivered",
            cancelled: "Cancel",
            hold: "CourierHold",
            delivered_approval_pending: "DeliveredApprovalPending",
            partial_delivered_approval_pending: "PartialDeliveredApprovalPending",
            cancelled_approval_pending: "CancelledApprovalPending",
            unknown_approval_pending: "UnknownApprovalPending",
            unknown: "CourierUnknown",
        };
        const mappedStatus = statusMap[payload.status];
        if (mappedStatus) {
            orderUpdate.status = mappedStatus;
        }
        if (payload.status === "delivered") {
            yield onOrderDelivered(order, (_e = payload.cod_amount) !== null && _e !== void 0 ? _e : existing.cod_amount);
        }
        // If order is still in Group A, deduct stock before moving to Group C
        const from = order.status;
        if (mappedStatus && GROUP_A.has(from) && !order.stockDeducted) {
            yield prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const items = yield tx.orderItem.findMany({ where: { orderId: order.id } });
                const productIds = new Set();
                for (const item of items) {
                    const variant = yield tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
                    if (!variant)
                        continue;
                    yield (0, product_service_1.adjustStock)(item.variantId, "SALE", item.quantity, `Order #${order.id} webhook: left Group A`, tx);
                    productIds.add(variant.productId);
                }
                for (const pid of productIds)
                    yield (0, product_service_1.syncProductStock)(pid, tx);
            }));
            orderUpdate.stockDeducted = true;
        }
        const updated = yield prisma_1.prisma.order.update({
            where: { id: order.id },
            data: orderUpdate,
            include: { items: true },
        });
        index_1.io.emit("order:updated", updated);
    });
}
// When order is delivered: record COD collection as a payment transaction if balance remains
function onOrderDelivered(order, codAmount) {
    return __awaiter(this, void 0, void 0, function* () {
        const remaining = order.total - order.paidAmount;
        if (remaining <= 0)
            return; // already fully paid
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
    });
}
function handleTrackingUpdate(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const order = yield findOrderByCid(payload.consignment_id);
        if (!order) {
            console.warn("[Webhook] tracking_update: order not found for cid", payload.consignment_id);
            return;
        }
        const existing = (_a = order.courier) !== null && _a !== void 0 ? _a : {};
        const courierUpdate = Object.assign(Object.assign({}, existing), { status_message: payload.tracking_message, last_update: (_b = payload.updated_at) !== null && _b !== void 0 ? _b : new Date().toISOString() });
        const updated = yield prisma_1.prisma.order.update({
            where: { id: order.id },
            data: { courier: courierUpdate },
            include: { items: true },
        });
        index_1.io.emit("order:updated", updated);
    });
}
