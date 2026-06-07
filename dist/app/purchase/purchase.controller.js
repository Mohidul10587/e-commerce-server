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
            const where = {};
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
                    yield tx.purchase.update({ where: { id: created.id }, data: { stockUpdated: true } });
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
            if (existing.stockUpdated && status === "Received") {
                return res.status(400).json({ message: "Stock already updated for this purchase" });
            }
            const updated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const purchase = yield tx.purchase.update({
                    where: { id },
                    data: { status },
                });
                if (status === "Received" && !existing.stockUpdated) {
                    yield applyStockForPurchase(existing.items, id, tx);
                    yield tx.purchase.update({ where: { id }, data: { stockUpdated: true } });
                }
                return purchase;
            }));
            return res.json({ purchase: updated });
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
            const existing = yield prisma_1.default.purchase.findUniqueOrThrow({ where: { id } });
            if (existing.stockUpdated) {
                return res.status(400).json({ message: "Cannot delete a received purchase (stock already updated)" });
            }
            yield prisma_1.default.purchase.delete({ where: { id } });
            return res.json({ message: "Deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
