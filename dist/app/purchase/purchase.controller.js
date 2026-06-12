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
exports.getPurchases = getPurchases;
exports.createPurchase = createPurchase;
exports.updatePurchaseStatus = updatePurchaseStatus;
exports.movePurchaseToTrash = movePurchaseToTrash;
exports.restorePurchase = restorePurchase;
exports.deletePurchase = deletePurchase;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const product_service_1 = require("../product/product.service");
function applyStockForPurchase(items, purchaseId, tx) {
    return __awaiter(this, void 0, void 0, function* () {
        const productIds = new Set();
        for (const item of items) {
            const variant = yield tx.productVariant.findUnique({
                where: { id: item.variantId },
                select: { productId: true },
            });
            if (variant) {
                yield (0, product_service_1.adjustStock)(item.variantId, "ADD", item.quantity, `Purchase #${purchaseId}`, tx);
                productIds.add(variant.productId);
            }
        }
        for (const pid of productIds)
            yield (0, product_service_1.syncProductStock)(pid, tx);
    });
}
function getPurchases(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const status = req.query.status;
            const trash = req.query.trash === "true";
            const where = { isTrashed: trash };
            if (status)
                where.status = status;
            if (search) {
                where.OR = [
                    { supplier: { name: { contains: search, mode: "insensitive" } } },
                    { items: { some: { productTitle: { contains: search, mode: "insensitive" } } } },
                ];
            }
            const [purchases, total] = yield Promise.all([
                prisma_1.default.purchase.findMany({
                    where,
                    include: {
                        supplier: { select: { id: true, name: true } },
                        items: true,
                    },
                    orderBy: { date: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma_1.default.purchase.count({ where }),
            ]);
            return res.json({ purchases, total });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function createPurchase(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { supplierId, date, status, note, items } = req.body;
            if (!(items === null || items === void 0 ? void 0 : items.length))
                return res.status(400).json({ message: "At least one item is required" });
            const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.purchasePrice, 0);
            const purchase = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const created = yield tx.purchase.create({
                    data: {
                        supplierId: supplierId || null,
                        date: new Date(date),
                        status,
                        note,
                        totalAmount,
                        items: {
                            create: items.map((i) => ({
                                variantId: i.variantId,
                                variantTitle: i.variantTitle,
                                productTitle: i.productTitle,
                                quantity: i.quantity,
                                purchasePrice: i.purchasePrice,
                            })),
                        },
                    },
                    include: { items: true },
                });
                if (status === "Received") {
                    yield applyStockForPurchase(created.items, created.id, tx);
                    yield tx.purchase.update({ where: { id: created.id }, data: { stockUpdated: true, receivedAt: new Date() } });
                }
                return created;
            }));
            return res.status(201).json({ purchase });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updatePurchaseStatus(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { status } = req.body;
            const existing = yield prisma_1.default.purchase.findUniqueOrThrow({
                where: { id },
                include: { items: true },
            });
            const updated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Pending/Ordered → Received: add stock
                if (status === "Received" && !existing.stockUpdated) {
                    yield applyStockForPurchase(existing.items, id, tx);
                    yield tx.purchase.update({ where: { id }, data: { stockUpdated: true, receivedAt: new Date() } });
                }
                // Received → Pending/Ordered: reverse stock
                if (existing.stockUpdated && status !== "Received") {
                    for (const item of existing.items) {
                        const variant = yield tx.productVariant.findUnique({
                            where: { id: item.variantId },
                            select: { productId: true, stock: true },
                        });
                        if (!variant)
                            continue;
                        const newStock = Math.max(0, variant.stock - item.quantity);
                        yield tx.productVariant.update({
                            where: { id: item.variantId },
                            data: { stock: newStock },
                        });
                        yield tx.stockHistory.create({
                            data: { variantId: item.variantId, action: "REMOVE", quantity: item.quantity, note: `Purchase #${id} un-received` },
                        });
                        yield (0, product_service_1.syncProductStock)(variant.productId, tx);
                    }
                    yield tx.purchase.update({ where: { id }, data: { stockUpdated: false, receivedAt: null } });
                }
                return tx.purchase.update({ where: { id }, data: { status } });
            }));
            return res.json({ purchase: updated });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function movePurchaseToTrash(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.purchase.update({ where: { id }, data: { isTrashed: true } });
            return res.json({ message: "Moved to trash" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function restorePurchase(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.purchase.update({ where: { id }, data: { isTrashed: false } });
            return res.json({ message: "Restored" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function deletePurchase(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.purchase.delete({ where: { id } });
            return res.json({ message: "Permanently deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
