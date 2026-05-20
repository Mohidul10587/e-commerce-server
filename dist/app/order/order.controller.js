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
exports.updateOrderStatus = exports.getOrderById = exports.getOrders = exports.createOrder = void 0;
const prisma_1 = require("../../lib/prisma");
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { customerName, customerPhone, address, city, postalCode, country, items, deliveryCharge, note } = req.body;
        if (!customerName || !customerPhone || !address || !city || !postalCode || !country || !(items === null || items === void 0 ? void 0 : items.length)) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // Validate variants and compute subtotal
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
        const total = subtotal + charge;
        const order = yield prisma_1.prisma.order.create({
            data: {
                customerName,
                customerPhone,
                address,
                city,
                postalCode,
                country,
                subtotal,
                deliveryCharge: charge,
                total,
                note: note || null,
                items: { create: resolvedItems },
            },
            include: { items: true },
        });
        // Deduct stock
        for (const item of resolvedItems) {
            yield prisma_1.prisma.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { decrement: item.quantity } },
            });
            yield prisma_1.prisma.stockHistory.create({
                data: { variantId: item.variantId, action: "SALE", quantity: item.quantity, note: `Order #${order.id}` },
            });
        }
        // Update product totalStock
        const variantIds = resolvedItems.map((i) => i.variantId);
        const affectedProducts = yield prisma_1.prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { productId: true },
        });
        const productIds = [...new Set(affectedProducts.map((v) => v.productId))];
        for (const productId of productIds) {
            const agg = yield prisma_1.prisma.productVariant.aggregate({ where: { productId }, _sum: { stock: true } });
            yield prisma_1.prisma.product.update({ where: { id: productId }, data: { totalStock: (_a = agg._sum.stock) !== null && _a !== void 0 ? _a : 0 } });
        }
        return res.status(201).json({ message: "Order placed successfully", order });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createOrder = createOrder;
const getOrders = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield prisma_1.prisma.order.findMany({
            include: { items: true },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ orders });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getOrders = getOrders;
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield prisma_1.prisma.order.findUnique({
            where: { id: Number(req.params.id) },
            include: { items: true },
        });
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
        });
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
