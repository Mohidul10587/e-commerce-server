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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShipment = exports.dispatchOrder = exports.trackByTrackingCode = exports.trackByInvoice = exports.trackByCid = void 0;
const prisma_1 = require("../../lib/prisma");
const steadfast_adapter_1 = require("./steadfast.adapter");
const courier_dispatch_1 = require("./courier.dispatch");
const index_1 = require("../../index");
const trackByCid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, steadfast_adapter_1.getStatusByConsignmentId)(req.params.id);
        return res.json(data);
    }
    catch (err) {
        console.error("[Courier] trackByCid:", err.message);
        return res.status(502).json({ message: err.message });
    }
});
exports.trackByCid = trackByCid;
const trackByInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, steadfast_adapter_1.getStatusByInvoice)(req.params.invoice);
        return res.json(data);
    }
    catch (err) {
        console.error("[Courier] trackByInvoice:", err.message);
        return res.status(502).json({ message: err.message });
    }
});
exports.trackByInvoice = trackByInvoice;
const trackByTrackingCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, steadfast_adapter_1.getStatusByTrackingCode)(req.params.trackingCode);
        return res.json(data);
    }
    catch (err) {
        console.error("[Courier] trackByTrackingCode:", err.message);
        return res.status(502).json({ message: err.message });
    }
});
exports.trackByTrackingCode = trackByTrackingCode;
/**
 * Manually trigger courier dispatch for an order.
 * Useful if the automatic InReview dispatch failed (network error etc.).
 * Idempotent — safe to call multiple times.
 */
const dispatchOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = Number(req.params.id);
        const order = yield prisma_1.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        const shipment = yield (0, courier_dispatch_1.submitOrderToCourier)(orderId, "steadfast");
        // Re-fetch order with updated courier data
        const updated = yield prisma_1.prisma.order.findUniqueOrThrow({
            where: { id: orderId },
            include: { items: true },
        });
        index_1.io.emit("order:updated", updated);
        return res.json({ message: "Consignment created", shipment });
    }
    catch (err) {
        console.error("[Courier] dispatchOrder:", err.message);
        return res.status(502).json({ message: err.message });
    }
});
exports.dispatchOrder = dispatchOrder;
/** Get the CourierShipment record for an order */
const getShipment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = Number(req.params.id);
        const shipment = yield prisma_1.prisma.courierShipment.findUnique({ where: { orderId } });
        if (!shipment)
            return res.status(404).json({ message: "No shipment found for this order" });
        return res.json({ shipment });
    }
    catch (err) {
        console.error("[Courier] getShipment:", err.message);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getShipment = getShipment;
