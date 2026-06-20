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
exports.dispatchOrder = exports.trackByTrackingCode = exports.trackByInvoice = exports.trackByCid = void 0;
const prisma_1 = require("../../lib/prisma");
const steadfast_service_1 = require("./steadfast.service");
const index_1 = require("../../index");
const trackByCid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, steadfast_service_1.getStatusByConsignmentId)(req.params.id);
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
        const data = yield (0, steadfast_service_1.getStatusByInvoice)(req.params.invoice);
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
        const data = yield (0, steadfast_service_1.getStatusByTrackingCode)(req.params.trackingCode);
        return res.json(data);
    }
    catch (err) {
        console.error("[Courier] trackByTrackingCode:", err.message);
        return res.status(502).json({ message: err.message });
    }
});
exports.trackByTrackingCode = trackByTrackingCode;
// Manually trigger courier consignment creation for an order
const dispatchOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const orderId = Number(req.params.id);
        const order = yield prisma_1.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        const courier = order.courier;
        if (courier === null || courier === void 0 ? void 0 : courier.consignment_id) {
            return res.status(409).json({ message: "Consignment already created", courier });
        }
        const invoice = `ORD-${orderId}`;
        const consignment = yield (0, steadfast_service_1.createConsignment)({
            invoice,
            recipient_name: order.customerName,
            recipient_phone: order.customerPhone,
            recipient_address: order.address,
            cod_amount: order.total,
            note: (_a = order.note) !== null && _a !== void 0 ? _a : undefined,
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
        const updated = yield prisma_1.prisma.order.update({
            where: { id: orderId },
            data: { courier: courierData },
            include: { items: true },
        });
        index_1.io.emit("order:updated", updated);
        return res.json({ message: "Consignment created", courier: courierData });
    }
    catch (err) {
        console.error("[Courier] dispatchOrder:", err.message);
        return res.status(502).json({ message: err.message });
    }
});
exports.dispatchOrder = dispatchOrder;
