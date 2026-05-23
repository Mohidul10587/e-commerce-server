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
exports.permanentDeleteOrder = exports.restoreOrder = exports.moveOrderToTrash = exports.updateOrder = exports.updateOrderStatus = exports.getOrderById = exports.getOrders = exports.createOrder = void 0;
const prisma_1 = require("../../lib/prisma");
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { customerName, customerPhone, address, city, postalCode, country, items, deliveryCharge, note } = req.body;
        if (!customerName || !customerPhone || !address || !city || !postalCode || !country || !(items === null || items === void 0 ? void 0 : items.length))
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
            });
        }
        const charge = Number(deliveryCharge) || 0;
        const order = yield prisma_1.prisma.order.create({
            data: {
                customerName, customerPhone, address, city, postalCode, country,
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
        return res.status(201).json({ message: "Order placed successfully", order });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createOrder = createOrder;
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { trash, search, page = "1", limit = "10" } = req.query;
        const where = { isTrashed: trash === "true" };
        if (search) {
            const s = search;
            where.OR = [
                { customerName: { contains: s, mode: "insensitive" } },
                { customerPhone: { contains: s, mode: "insensitive" } },
                { city: { contains: s, mode: "insensitive" } },
            ];
        }
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
        const order = yield prisma_1.prisma.order.update({ where: { id: Number(req.params.id) }, data: { status } });
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
const updateOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { customerName, customerPhone, address, city, postalCode, country, note, status } = req.body;
        const data = {};
        if (customerName)
            data.customerName = customerName;
        if (customerPhone)
            data.customerPhone = customerPhone;
        if (address)
            data.address = address;
        if (city)
            data.city = city;
        if (postalCode)
            data.postalCode = postalCode;
        if (country)
            data.country = country;
        if (note !== undefined)
            data.note = note;
        if (status)
            data.status = status;
        const order = yield prisma_1.prisma.order.update({ where: { id }, data, include: { items: true } });
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrder = updateOrder;
const moveOrderToTrash = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.order.update({ where: { id: Number(req.params.id) }, data: { isTrashed: true } });
        return res.json({ message: "Order moved to trash" });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.moveOrderToTrash = moveOrderToTrash;
const restoreOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.order.update({ where: { id: Number(req.params.id) }, data: { isTrashed: false } });
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
        return res.json({ message: "Order permanently deleted" });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.permanentDeleteOrder = permanentDeleteOrder;
