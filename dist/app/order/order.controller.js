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
exports.designerSubmitDesign = exports.getOrderForDesigner = exports.bulkAssignDesigner = exports.assignDesigner = exports.emptyOrderTrash = exports.updateOrderPayment = exports.updateOrderPaymentTx = exports.deleteOrderPayment = exports.getOrderPayments = exports.updateOrderDiscount = exports.bulkUpdateOrderStatus = exports.bulkRestoreOrders = exports.bulkTrashOrders = exports.permanentDeleteOrder = exports.restoreOrder = exports.moveOrderToTrash = exports.updateOrderItemSealText = exports.updateOrderItemVariant = exports.updateOrderItemQuantity = exports.removeOrderItem = exports.addOrderItem = exports.updateOrder = exports.updateOrderStatus = exports.getOrderById = exports.getOrders = exports.createOrder = exports.getOrderStatusCounts = void 0;
const prisma_1 = require("../../lib/prisma");
const index_1 = require("../../index");
const steadfast_service_1 = require("../courier/steadfast.service");
const GROUP_A = new Set([
    "Processing",
    "WaitForDesign",
    "DesignSubmitted",
    "Revision",
    "CustomerInformed",
    "NeedToCall",
    "NoResponse",
    "UrgentDesign",
    "Problem",
    "OnHold",
    "NotInterested",
]);
const GROUP_B = new Set([
    "Cancel",
    "InProduction",
    "InReview",
    "Pending",
    "Delivered",
    "PartlyDelivered",
]);
const VALID_STATUSES = [
    "Processing",
    "WaitForDesign",
    "DesignSubmitted",
    "Revision",
    "CustomerInformed",
    "NeedToCall",
    "NoResponse",
    "UrgentDesign",
    "Problem",
    "OnHold",
    "NotInterested",
    "OrderConfirmed",
    "InProduction",
    "InReview",
    "Pending",
    "Delivered",
    "PartlyDelivered",
    "Cancel",
];
const getOrderStatusCounts = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [all, trash, ...rest] = yield Promise.all([
            prisma_1.prisma.order.count({ where: { isTrashed: false } }),
            prisma_1.prisma.order.count({ where: { isTrashed: true } }),
            ...VALID_STATUSES.map((s) => prisma_1.prisma.order.count({ where: { isTrashed: false, status: s } })),
            prisma_1.prisma.order.count({
                where: { isTrashed: false, paymentStatus: "unpaid" },
            }),
            prisma_1.prisma.order.count({
                where: { isTrashed: false, paymentStatus: "partial" },
            }),
            prisma_1.prisma.order.count({
                where: { isTrashed: false, paymentStatus: "paid" },
            }),
        ]);
        const counts = { all, trash };
        VALID_STATUSES.forEach((s, i) => {
            counts[s] = rest[i];
        });
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
    try {
        const { customerName, customerPhone, alternativePhone, address, contactLink, items, deliveryCharge, note, discount, discountPercent, status, } = req.body;
        if (!customerName || !customerPhone || !address || !(items === null || items === void 0 ? void 0 : items.length))
            return res.status(400).json({ message: "Missing required fields" });
        let subtotal = 0;
        const resolvedItems = [];
        for (const item of items) {
            const isFree = !!item.isFreeItem;
            const variant = yield prisma_1.prisma.productVariant.findUnique({
                where: { id: Number(item.variantId) },
                include: { product: true },
            });
            if (!variant)
                return res
                    .status(400)
                    .json({ message: `Variant ${item.variantId} not found` });
            const price = isFree ? 0 : variant.salePrice;
            subtotal += price * item.quantity;
            resolvedItems.push({
                variantId: variant.id,
                title: `${variant.product.title} — ${variant.title}`,
                price,
                quantity: item.quantity,
                sealText: variant.product.type === "seal" ? item.sealText || null : null,
                isFreeItem: isFree,
            });
        }
        const charge = Number(deliveryCharge) || 0;
        const disc = Number(discount) >= 0 ? Number(discount) : 0;
        const discPct = Number(discountPercent) >= 0 ? Number(discountPercent) : 0;
        const order = yield prisma_1.prisma.order.create({
            data: {
                customerName,
                customerPhone,
                alternativePhone: alternativePhone || null,
                address,
                contactLink: contactLink || null,
                subtotal,
                deliveryCharge: charge,
                total: subtotal + charge - disc,
                discount: disc,
                discountPercent: discPct,
                status: status || undefined,
                note: note || null,
                items: { create: resolvedItems },
            },
            include: { items: true },
        });
        index_1.io.emit("order:new", order);
        return res
            .status(201)
            .json({ message: "Order placed successfully", order });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createOrder = createOrder;
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { trash, search, page = "1", limit = "10", status, payment, sort, assignedDesignerId, } = req.query;
        const where = { isTrashed: trash === "true" };
        if (search) {
            const s = search;
            where.OR = [
                { customerName: { contains: s, mode: "insensitive" } },
                { customerPhone: { contains: s, mode: "insensitive" } },
            ];
        }
        // Support comma-separated statuses e.g. "WaitForDesign,Revision,DesignSubmitted"
        if (status) {
            const statuses = status
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
        }
        if (payment)
            where.paymentStatus = payment;
        if (assignedDesignerId)
            where.assignedDesignerId = parseInt(assignedDesignerId);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const orderDir = sort === "asc" ? "asc" : "desc";
        const [orders, total] = yield Promise.all([
            prisma_1.prisma.order.findMany({
                where,
                include: {
                    items: true,
                    assignedDesigner: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: orderDir },
                skip,
                take,
            }),
            prisma_1.prisma.order.count({ where }),
        ]);
        return res.json({
            orders,
            total,
            page: parseInt(page),
            limit: take,
        });
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
    var _a, _b;
    try {
        const { status } = req.body;
        const id = Number(req.params.id);
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const existing = yield prisma_1.prisma.order.findUniqueOrThrow({
            where: { id },
            include: { items: true },
        });
        const from = existing.status;
        // Block: Group A → Group B directly (must go through OrderConfirmed)
        if (GROUP_A.has(from) && GROUP_B.has(status)) {
            return res
                .status(400)
                .json({
                message: `Cannot transition from ${from} directly to ${status}. Must confirm order first.`,
            });
        }
        yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // OrderConfirmed → deduct stock (only once)
            if (status === "OrderConfirmed" && !existing.stockDeducted) {
                for (const item of existing.items) {
                    const variant = yield tx.productVariant.findUnique({
                        where: { id: item.variantId },
                        select: { productId: true, stock: true },
                    });
                    if (!variant)
                        continue;
                    yield tx.productVariant.update({
                        where: { id: item.variantId },
                        data: { stock: { decrement: item.quantity } },
                    });
                    yield tx.stockHistory.create({
                        data: {
                            variantId: item.variantId,
                            action: "SALE",
                            quantity: item.quantity,
                            note: `Order #${id} confirmed`,
                        },
                    });
                    const agg = yield tx.productVariant.aggregate({
                        where: { productId: variant.productId },
                        _sum: { stock: true },
                    });
                    yield tx.product.update({
                        where: { id: variant.productId },
                        data: { totalStock: (_a = agg._sum.stock) !== null && _a !== void 0 ? _a : 0 },
                    });
                }
                yield tx.order.update({ where: { id }, data: { stockDeducted: true } });
            }
            // Post-confirmation → Group A: restore stock if previously deducted
            if (GROUP_A.has(status) && existing.stockDeducted) {
                for (const item of existing.items) {
                    const variant = yield tx.productVariant.findUnique({
                        where: { id: item.variantId },
                        select: { productId: true },
                    });
                    if (!variant)
                        continue;
                    yield tx.productVariant.update({
                        where: { id: item.variantId },
                        data: { stock: { increment: item.quantity } },
                    });
                    yield tx.stockHistory.create({
                        data: {
                            variantId: item.variantId,
                            action: "RETURN",
                            quantity: item.quantity,
                            note: `Order #${id} returned to ${status}`,
                        },
                    });
                    const agg = yield tx.productVariant.aggregate({
                        where: { productId: variant.productId },
                        _sum: { stock: true },
                    });
                    yield tx.product.update({
                        where: { id: variant.productId },
                        data: { totalStock: (_b = agg._sum.stock) !== null && _b !== void 0 ? _b : 0 },
                    });
                }
                yield tx.order.update({
                    where: { id },
                    data: { stockDeducted: false },
                });
            }
            const extraData = { status };
            if (status === "OrderConfirmed" && !existing.confirmedAt) {
                extraData.confirmedAt = new Date();
            }
            yield tx.order.update({ where: { id }, data: extraData });
        }));
        let order = yield prisma_1.prisma.order.findUniqueOrThrow({
            where: { id },
            include: { items: true },
        });
        // Auto-create SteadFast consignment on InReview (only once)
        if (status === "InReview" && !((_a = order.courier) === null || _a === void 0 ? void 0 : _a.consignment_id)) {
            try {
                const invoice = `ORD-${id}`;
                const consignment = yield (0, steadfast_service_1.createConsignment)({
                    invoice,
                    recipient_name: order.customerName,
                    recipient_phone: order.customerPhone,
                    recipient_address: order.address,
                    cod_amount: order.total,
                    note: (_b = order.note) !== null && _b !== void 0 ? _b : undefined,
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
                order = yield prisma_1.prisma.order.update({
                    where: { id },
                    data: { courier: courierData },
                    include: { items: true },
                });
                console.log(`[Courier] ✅ Order #${id} submitted to SteadFast successfully.\n`, `  consignment_id : ${consignment.consignment_id}\n`, `  tracking_code  : ${consignment.tracking_code}\n`, `  invoice        : ${consignment.invoice}\n`, `  status         : ${consignment.status}\n`, `  cod_amount     : ${consignment.cod_amount}`);
            }
            catch (courierErr) {
                console.error(`[Courier] Failed to create consignment for order #${id}:`, courierErr.message);
                // Non-fatal: order status is already updated; log and continue
            }
        }
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (_c) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
const updateOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = Number(req.params.id);
        const { customerName, customerPhone, alternativePhone, address, contactLink, status, discount, discountPercent, paidAmount, items, note, } = req.body;
        const data = {};
        if (customerName)
            data.customerName = customerName;
        if (customerPhone)
            data.customerPhone = customerPhone;
        if (alternativePhone !== undefined)
            data.alternativePhone = alternativePhone || null;
        if (address)
            data.address = address;
        if (contactLink !== undefined)
            data.contactLink = contactLink || null;
        if (note !== undefined)
            data.note = note || null;
        if (status)
            data.status = status;
        // Replace items if provided
        if (Array.isArray(items)) {
            // Resolve each item's price from DB
            let subtotal = 0;
            const resolved = [];
            for (const item of items) {
                const isFree = !!item.isFreeItem;
                const variant = yield prisma_1.prisma.productVariant.findUnique({
                    where: { id: Number(item.variantId) },
                    include: { product: true },
                });
                if (!variant)
                    return res
                        .status(400)
                        .json({ message: `Variant ${item.variantId} not found` });
                const qty = Number(item.quantity) || 1;
                const price = isFree ? 0 : variant.salePrice;
                subtotal += price * qty;
                resolved.push({
                    variantId: variant.id,
                    title: `${variant.product.title} — ${variant.title}`,
                    price,
                    quantity: qty,
                    sealText: variant.product.type === "seal" ? item.sealText || null : null,
                    isFreeItem: isFree,
                });
            }
            // Delete old items and create new ones
            yield prisma_1.prisma.orderItem.deleteMany({ where: { orderId: id } });
            data.subtotal = subtotal;
            data.items = { create: resolved };
        }
        const existing = yield prisma_1.prisma.order.findUnique({
            where: { id },
            select: { subtotal: true, deliveryCharge: true, total: true },
        });
        if (!existing)
            return res.status(404).json({ message: "Order not found" });
        const subtotal = (_a = data.subtotal) !== null && _a !== void 0 ? _a : existing.subtotal;
        const deliveryCharge = existing.deliveryCharge;
        const disc = discount !== undefined &&
            !isNaN(Number(discount)) &&
            Number(discount) >= 0
            ? Number(discount)
            : undefined;
        if (disc !== undefined)
            data.discount = disc;
        if (discountPercent !== undefined && !isNaN(Number(discountPercent)))
            data.discountPercent = Number(discountPercent);
        const newTotal = subtotal + deliveryCharge - (disc !== null && disc !== void 0 ? disc : 0);
        data.total = newTotal;
        const order = yield prisma_1.prisma.order.update({
            where: { id },
            data,
            include: { items: true },
        });
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrder = updateOrder;
const addOrderItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = Number(req.params.id);
        const { variantId, quantity, sealText } = req.body;
        const variant = yield prisma_1.prisma.productVariant.findUnique({
            where: { id: Number(variantId) },
            include: { product: true },
        });
        if (!variant)
            return res.status(400).json({ message: "Variant not found" });
        const qty = Number(quantity) || 1;
        const isSeal = variant.product.type === "seal";
        const [item] = yield prisma_1.prisma.$transaction([
            prisma_1.prisma.orderItem.create({
                data: {
                    orderId,
                    variantId: variant.id,
                    title: `${variant.product.title} — ${variant.title}`,
                    price: variant.salePrice,
                    quantity: qty,
                    sealText: isSeal ? sealText || null : null,
                },
            }),
            prisma_1.prisma.order.update({
                where: { id: orderId },
                data: {
                    subtotal: { increment: variant.salePrice * qty },
                    total: { increment: variant.salePrice * qty },
                },
            }),
        ]);
        return res.json({ item });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.addOrderItem = addOrderItem;
const removeOrderItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemId = Number(req.params.itemId);
        const item = yield prisma_1.prisma.orderItem.findUnique({ where: { id: itemId } });
        if (!item)
            return res.status(404).json({ message: "Item not found" });
        const deduct = item.price * item.quantity;
        yield prisma_1.prisma.$transaction([
            prisma_1.prisma.orderItem.delete({ where: { id: itemId } }),
            prisma_1.prisma.order.update({
                where: { id: item.orderId },
                data: { subtotal: { decrement: deduct }, total: { decrement: deduct } },
            }),
        ]);
        return res.json({ message: "Item removed" });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.removeOrderItem = removeOrderItem;
const updateOrderItemQuantity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemId = Number(req.params.itemId);
        const { quantity } = req.body;
        const qty = Number(quantity);
        if (!qty || qty < 1)
            return res.status(400).json({ message: "Invalid quantity" });
        const existing = yield prisma_1.prisma.orderItem.findUnique({
            where: { id: itemId },
        });
        if (!existing)
            return res.status(404).json({ message: "Item not found" });
        const diff = (qty - existing.quantity) * existing.price;
        const [item] = yield prisma_1.prisma.$transaction([
            prisma_1.prisma.orderItem.update({
                where: { id: itemId },
                data: { quantity: qty },
            }),
            prisma_1.prisma.order.update({
                where: { id: existing.orderId },
                data: { subtotal: { increment: diff }, total: { increment: diff } },
            }),
        ]);
        return res.json({ item });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderItemQuantity = updateOrderItemQuantity;
const updateOrderItemVariant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemId = Number(req.params.itemId);
        const { variantId } = req.body;
        if (!variantId)
            return res.status(400).json({ message: "variantId required" });
        const variant = yield prisma_1.prisma.productVariant.findUnique({
            where: { id: Number(variantId) },
            include: { product: true },
        });
        if (!variant)
            return res.status(404).json({ message: "Variant not found" });
        const existing = yield prisma_1.prisma.orderItem.findUnique({
            where: { id: itemId },
        });
        if (!existing)
            return res.status(404).json({ message: "Item not found" });
        const priceDiff = (variant.salePrice - existing.price) * existing.quantity;
        const isSeal = variant.product.type === "seal";
        const [item] = yield prisma_1.prisma.$transaction([
            prisma_1.prisma.orderItem.update({
                where: { id: itemId },
                data: {
                    variantId: variant.id,
                    title: `${variant.product.title} — ${variant.title}`,
                    price: variant.salePrice,
                    sealText: isSeal ? existing.sealText : null,
                },
            }),
            prisma_1.prisma.order.update({
                where: { id: existing.orderId },
                data: {
                    subtotal: { increment: priceDiff },
                    total: { increment: priceDiff },
                },
            }),
        ]);
        return res.json({ item });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderItemVariant = updateOrderItemVariant;
const updateOrderItemSealText = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemId = Number(req.params.itemId);
        const { sealText } = req.body;
        const item = yield prisma_1.prisma.orderItem.update({
            where: { id: itemId },
            data: { sealText: sealText !== null && sealText !== void 0 ? sealText : null },
        });
        return res.json({ item });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderItemSealText = updateOrderItemSealText;
const moveOrderToTrash = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.order.update({
            where: { id: Number(req.params.id) },
            data: { isTrashed: true },
        });
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
        yield prisma_1.prisma.order.updateMany({
            where: { id: { in: ids } },
            data: { isTrashed: true },
        });
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
        yield prisma_1.prisma.order.updateMany({
            where: { id: { in: ids } },
            data: { isTrashed: false },
        });
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
            return res
                .status(400)
                .json({ message: "ids array and status are required" });
        yield prisma_1.prisma.order.updateMany({
            where: { id: { in: ids } },
            data: { status },
        });
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
        const { discount, discountPercent } = req.body;
        if (discount === undefined ||
            isNaN(Number(discount)) ||
            Number(discount) < 0)
            return res.status(400).json({ message: "Valid discount is required" });
        const existing = yield prisma_1.prisma.order.findUnique({
            where: { id },
            select: { subtotal: true, deliveryCharge: true },
        });
        if (!existing)
            return res.status(404).json({ message: "Order not found" });
        const d = Number(discount);
        const dp = discountPercent !== undefined && !isNaN(Number(discountPercent))
            ? Number(discountPercent)
            : 0;
        const total = existing.subtotal + existing.deliveryCharge - d;
        const order = yield prisma_1.prisma.order.update({
            where: { id },
            data: { discount: d, discountPercent: dp, total },
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
const getOrderPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield prisma_1.prisma.paymentTransaction.findMany({
            where: { orderId: Number(req.params.id) },
            orderBy: { createdAt: "asc" },
        });
        return res.json({ transactions });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getOrderPayments = getOrderPayments;
const deleteOrderPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const txId = Number(req.params.txId);
        const tx = yield prisma_1.prisma.paymentTransaction.findUnique({
            where: { id: txId },
        });
        if (!tx)
            return res.status(404).json({ message: "Transaction not found" });
        yield prisma_1.prisma.paymentTransaction.delete({ where: { id: txId } });
        // Recalculate paidAmount from remaining transactions
        const agg = yield prisma_1.prisma.paymentTransaction.aggregate({
            where: { orderId: tx.orderId },
            _sum: { amount: true },
        });
        const newPaid = (_a = agg._sum.amount) !== null && _a !== void 0 ? _a : 0;
        const order = yield prisma_1.prisma.order.findUnique({
            where: { id: tx.orderId },
            select: { total: true },
        });
        const paymentStatus = newPaid <= 0
            ? "unpaid"
            : newPaid >= ((_b = order === null || order === void 0 ? void 0 : order.total) !== null && _b !== void 0 ? _b : 0)
                ? "paid"
                : "partial";
        yield prisma_1.prisma.order.update({
            where: { id: tx.orderId },
            data: { paidAmount: newPaid, paymentStatus },
        });
        index_1.io.emit("order:updated", { id: tx.orderId });
        return res.json({ message: "Payment deleted" });
    }
    catch (_c) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteOrderPayment = deleteOrderPayment;
const updateOrderPaymentTx = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const txId = Number(req.params.txId);
        const { amount, source, trxId, note } = req.body;
        const tx = yield prisma_1.prisma.paymentTransaction.findUnique({
            where: { id: txId },
        });
        if (!tx)
            return res.status(404).json({ message: "Transaction not found" });
        yield prisma_1.prisma.paymentTransaction.update({
            where: { id: txId },
            data: {
                amount: amount !== undefined ? Number(amount) : tx.amount,
                source: source !== undefined ? source || null : tx.source,
                trxId: trxId !== undefined ? trxId || null : tx.trxId,
                note: note !== undefined ? note || null : tx.note,
            },
        });
        const agg = yield prisma_1.prisma.paymentTransaction.aggregate({
            where: { orderId: tx.orderId },
            _sum: { amount: true },
        });
        const newPaid = (_a = agg._sum.amount) !== null && _a !== void 0 ? _a : 0;
        const order = yield prisma_1.prisma.order.findUnique({
            where: { id: tx.orderId },
            select: { total: true },
        });
        const paymentStatus = newPaid <= 0
            ? "unpaid"
            : newPaid >= ((_b = order === null || order === void 0 ? void 0 : order.total) !== null && _b !== void 0 ? _b : 0)
                ? "paid"
                : "partial";
        yield prisma_1.prisma.order.update({
            where: { id: tx.orderId },
            data: { paidAmount: newPaid, paymentStatus },
        });
        index_1.io.emit("order:updated", { id: tx.orderId });
        return res.json({ message: "Payment updated" });
    }
    catch (_c) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderPaymentTx = updateOrderPaymentTx;
const updateOrderPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { amount, note, source, trxId } = req.body;
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
            return res.status(400).json({ message: "Valid amount is required" });
        const existing = yield prisma_1.prisma.order.findUnique({
            where: { id },
            select: { total: true, paidAmount: true },
        });
        if (!existing)
            return res.status(404).json({ message: "Order not found" });
        const newPaid = existing.paidAmount + Number(amount);
        const paymentStatus = newPaid >= existing.total ? "paid" : "partial";
        const order = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.paymentTransaction.create({
                data: {
                    orderId: id,
                    amount: Number(amount),
                    note: note || null,
                    source: source || null,
                    trxId: trxId || null,
                },
            });
            return tx.order.update({
                where: { id },
                data: { paidAmount: newPaid, paymentStatus, paidAt: new Date() },
                include: {
                    items: true,
                    transactions: { orderBy: { createdAt: "asc" } },
                },
            });
        }));
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateOrderPayment = updateOrderPayment;
const emptyOrderTrash = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { count } = yield prisma_1.prisma.order.deleteMany({
            where: { isTrashed: true },
        });
        return res.json({ message: `${count} orders permanently deleted` });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.emptyOrderTrash = emptyOrderTrash;
const assignDesigner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { designerId } = req.body; // null to unassign
        const order = yield prisma_1.prisma.order.update({
            where: { id },
            data: { assignedDesignerId: designerId !== null && designerId !== void 0 ? designerId : null }, // Temporarily empty - assignedDesignerId field not available
            include: { items: true },
        });
        index_1.io.emit("order:updated", order);
        return res.json({ order });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.assignDesigner = assignDesigner;
const bulkAssignDesigner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, designerId } = req.body;
        if (!Array.isArray(ids) || ids.length === 0 || !designerId) {
            return res.status(400).json({ message: "ids and designerId are required" });
        }
        yield prisma_1.prisma.order.updateMany({
            where: { id: { in: ids.map(Number) } },
            data: { assignedDesignerId: Number(designerId) },
        });
        index_1.io.emit("order:updated", {});
        return res.json({ message: `${ids.length} orders assigned` });
    }
    catch (_a) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.bulkAssignDesigner = bulkAssignDesigner;
// Designer-only: get order details without sensitive info (no price, no customer info)
const getOrderForDesigner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = Number(req.params.id);
        // @ts-ignore
        const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const order = yield prisma_1.prisma.order.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                note: true,
                createdAt: true,
                assignedDesignerId: true,
                items: {
                    select: {
                        id: true,
                        title: true,
                        quantity: true,
                        sealText: true,
                        isFreeItem: true,
                    },
                },
            },
        });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        if (order.assignedDesignerId !== requesterId)
            return res.status(403).json({ message: "Not assigned to you" });
        return res.json({ order });
    }
    catch (_b) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getOrderForDesigner = getOrderForDesigner;
// Designer-only: submit design (WaitForDesign/Revision → DesignSubmitted)
const designerSubmitDesign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = Number(req.params.id);
        // @ts-ignore
        const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const existing = yield prisma_1.prisma.order.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ message: "Order not found" });
        if (existing.assignedDesignerId !== requesterId)
            return res.status(403).json({ message: "Not assigned to you" });
        if (!["WaitForDesign", "Revision", "UrgentDesign"].includes(existing.status))
            return res.status(400).json({ message: "Order is not in a design stage" });
        const order = yield prisma_1.prisma.order.update({
            where: { id },
            data: { status: "DesignSubmitted" },
            include: { items: true },
        });
        index_1.io.emit("order:updated", order);
        return res.json({ message: "Design submitted", order });
    }
    catch (_b) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.designerSubmitDesign = designerSubmitDesign;
