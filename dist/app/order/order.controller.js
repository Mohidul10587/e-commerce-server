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
exports.updateOrderPayment = exports.updateOrderDiscount = exports.bulkUpdateOrderStatus = exports.bulkRestoreOrders = exports.bulkTrashOrders = exports.permanentDeleteOrder = exports.restoreOrder = exports.moveOrderToTrash = exports.updateOrderItemSealText = exports.updateOrder = exports.updateOrderStatus = exports.getOrderById = exports.getOrders = exports.createOrder = exports.getOrderStatusCounts = void 0;
const prisma_1 = require("../../lib/prisma");
const index_1 = require("../../index");
const VALID_STATUSES = [
    "Processing", "WaitForDesign", "DesignSubmitted", "Revision",
    "CustomerInformed", "NeedToCall", "NoResponse", "OrderConfirmed",
    "InProduction", "InReview", "Pending", "Delivered", "PartlyDelivered", "Cancel",
];
const getOrderStatusCounts = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [all, trash, ...rest] = yield Promise.all([
            prisma_1.prisma.order.count({ where: { isTrashed: false } }),
            prisma_1.prisma.order.count({ where: { isTrashed: true } }),
            ...VALID_STATUSES.map((s) => prisma_1.prisma.order.count({ where: { isTrashed: false, status: s } })),
            prisma_1.prisma.order.count({ where: { isTrashed: false, paymentStatus: "unpaid" } }),
            prisma_1.prisma.order.count({ where: { isTrashed: false, paymentStatus: "partial" } }),
            prisma_1.prisma.order.count({ where: { isTrashed: false, paymentStatus: "paid" } }),
        ]);
        const counts = { all, trash };
        VALID_STATUSES.forEach((s, i) => { counts[s] = rest[i]; });
        const offset = VALID_STATUSES.length;
        counts["unpaid"] = rest[offset];
        counts["partial"] = rest[offset + 1];
        counts["paid"] = rest[offset + 2];
        return res.json(counts);
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getOrderStatusCounts = getOrderStatusCounts;
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { customerName, customerPhone, address, items, deliveryCharge, note } = req.body;
        if (!customerName || !customerPhone || !address || !(items === null || items === void 0 ? void 0 : items.length))
            return res.status(400).json({ message: "Missing required fields" });
        let subtotal = 0;
        const resolvedItems = [];
        for (const item of items) {
            const variant = yield prisma_1.prisma.productVariant.findUnique({
                where: { id: Number(item.variantId) },
                include: { product: true },
            });
            if (!variant)
                return res.status(400).json({ message: `Variant ${item.variantId} not found` });
            if (variant.stock < item.quantity)
                return res.status(400).json({ message: `Insufficient stock for ${variant.product.title}` });
            subtotal += variant.salePrice * item.quantity;
            resolvedItems.push({
                variantId: variant.id,
                title: `${variant.product.title} — ${variant.title}`,
                price: variant.salePrice,
                quantity: item.quantity,
                sealText: variant.product.type === "seal" ? (item.sealText || null) : null,
            });
        }
        const charge = Number(deliveryCharge) || 0;
        const order = yield prisma_1.prisma.order.create({
            data: {
                customerName, customerPhone, address,
                subtotal, deliveryCharge: charge, total: subtotal + charge,
                note: note || null,
                items: { create: resolvedItems },
            },
            include: { items: true },
        });
        for (const item of resolvedItems) {
            yield prisma_1.prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
            yield prisma_1.prisma.stockHistory.create({ data: { variantId: item.variantId, action: "SALE", quantity: item.quantity, note: `Order #${order.id}` } });
        }
        const productIds = [...new Set((yield prisma_1.prisma.productVariant.findMany({ where: { id: { in: resolvedItems.map((i) => i.variantId) } }, select: { productId: true } }))
                .map((v) => v.productId))];
        for (const productId of productIds) {
            const agg = yield prisma_1.prisma.productVariant.aggregate({ where: { productId }, _sum: { stock: true } });
            yield prisma_1.prisma.product.update({ where: { id: productId }, data: { totalStock: (_a = agg._sum.stock) !== null && _a !== void 0 ? _a : 0 } });
        }
        index_1.io.emit("order:new", order);
        return res.status(201).json({ message: "Order placed successfully", order });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createOrder = createOrder;
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { trash, search, page = "1", limit = "10", status, payment } = req.query;
        const where = { isTrashed: trash === "true" };
        if (search) {
            const s = search;
            where.OR = [
                { customerName: { contains: s, mode: "insensitive" } },
                { customerPhone: { contains: s, mode: "insensitive" } },
            ];
        }
        if (status)
            where.status = status;
        if (payment)
            where.paymentStatus = payment;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const [orders, total] = yield Promise.all([
            prisma_1.prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, skip, take }),
            prisma_1.prisma.order.count({ where }),
        ]);
        return res.json({ orders, total, page: parseInt(page), limit: take });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getOrders = getOrders;
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield prisma_1.prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: { items: true } });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getOrderById = getOrderById;
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        const order = yield prisma_1.prisma.order.update({
            where: { id: Number(req.params.id) },
            data: { status },
            include: { items: true },
        });
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
const updateOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const id = Number(req.params.id);
        const { customerName, customerPhone, address, note, status, discount, paidAmount } = req.body;
        const data = {};
        if (customerName)
            data.customerName = customerName;
        if (customerPhone)
            data.customerPhone = customerPhone;
        if (address)
            data.address = address;
        if (note !== undefined)
            data.note = note;
        if (status)
            data.status = status;
        if (discount !== undefined && !isNaN(Number(discount)) && Number(discount) >= 0) {
            const existing = yield prisma_1.prisma.order.findUnique({ where: { id }, select: { subtotal: true, deliveryCharge: true } });
            if (existing) {
                data.discount = Number(discount);
                data.total = existing.subtotal + existing.deliveryCharge - Number(discount);
            }
        }
        if (paidAmount !== undefined && !isNaN(Number(paidAmount)) && Number(paidAmount) >= 0) {
            const existing = yield prisma_1.prisma.order.findUnique({ where: { id }, select: { total: true } });
            const total = (_b = (_a = data.total) !== null && _a !== void 0 ? _a : existing === null || existing === void 0 ? void 0 : existing.total) !== null && _b !== void 0 ? _b : 0;
            const paid = Number(paidAmount);
            data.paidAmount = paid;
            data.paymentStatus = paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";
        }
        const order = yield prisma_1.prisma.order.update({ where: { id }, data, include: { items: true } });
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (_c) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrder = updateOrder;
const updateOrderItemSealText = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemId = Number(req.params.itemId);
        const { sealText } = req.body;
        const item = yield prisma_1.prisma.orderItem.update({ where: { id: itemId }, data: { sealText: sealText !== null && sealText !== void 0 ? sealText : null } });
        return res.json({ item });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderItemSealText = updateOrderItemSealText;
const moveOrderToTrash = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.order.update({ where: { id: Number(req.params.id) }, data: { isTrashed: true } });
        index_1.io.emit("order:trashed", { id: Number(req.params.id) });
        return res.json({ message: "Order moved to trash" });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.moveOrderToTrash = moveOrderToTrash;
const restoreOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield prisma_1.prisma.order.update({
            where: { id: Number(req.params.id) },
            data: { isTrashed: false },
            include: { items: true },
        });
        index_1.io.emit("order:restored", order);
        return res.json({ message: "Order restored" });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.restoreOrder = restoreOrder;
const permanentDeleteOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.order.delete({ where: { id: Number(req.params.id) } });
        index_1.io.emit("order:deleted", { id: Number(req.params.id) });
        return res.json({ message: "Order permanently deleted" });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.permanentDeleteOrder = permanentDeleteOrder;
const bulkTrashOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ message: "ids array is required" });
        yield prisma_1.prisma.order.updateMany({ where: { id: { in: ids } }, data: { isTrashed: true } });
        index_1.io.emit("order:trashed", { ids });
        return res.json({ message: `${ids.length} orders moved to trash` });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.bulkTrashOrders = bulkTrashOrders;
const bulkRestoreOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ message: "ids array is required" });
        yield prisma_1.prisma.order.updateMany({ where: { id: { in: ids } }, data: { isTrashed: false } });
        index_1.io.emit("order:restored", { ids });
        return res.json({ message: `${ids.length} orders restored` });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.bulkRestoreOrders = bulkRestoreOrders;
const bulkUpdateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0 || !status)
            return res.status(400).json({ message: "ids array and status are required" });
        yield prisma_1.prisma.order.updateMany({ where: { id: { in: ids } }, data: { status } });
        index_1.io.emit("order:updated", { ids, status });
        return res.json({ message: `${ids.length} orders updated to "${status}"` });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.bulkUpdateOrderStatus = bulkUpdateOrderStatus;
const updateOrderDiscount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { discount } = req.body;
        if (discount === undefined || isNaN(Number(discount)) || Number(discount) < 0)
            return res.status(400).json({ message: "Valid discount is required" });
        const existing = yield prisma_1.prisma.order.findUnique({ where: { id }, select: { subtotal: true, deliveryCharge: true } });
        if (!existing)
            return res.status(404).json({ message: "Order not found" });
        const d = Number(discount);
        const total = existing.subtotal + existing.deliveryCharge - d;
        const order = yield prisma_1.prisma.order.update({
            where: { id },
            data: { discount: d, total },
            include: { items: true },
        });
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderDiscount = updateOrderDiscount;
const updateOrderPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { paidAmount } = req.body;
        if (paidAmount === undefined || isNaN(Number(paidAmount)) || Number(paidAmount) < 0)
            return res.status(400).json({ message: "Valid paidAmount is required" });
        const paid = Number(paidAmount);
        // Fetch total to compute paymentStatus
        const existing = yield prisma_1.prisma.order.findUnique({ where: { id }, select: { total: true } });
        if (!existing)
            return res.status(404).json({ message: "Order not found" });
        const paymentStatus = paid <= 0 ? "unpaid" : paid >= existing.total ? "paid" : "partial";
        const order = yield prisma_1.prisma.order.update({
            where: { id },
            data: { paidAmount: paid, paymentStatus },
            include: { items: true },
        });
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderPayment = updateOrderPayment;
