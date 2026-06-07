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
exports.getInventoryStats = getInventoryStats;
exports.getStockList = getStockList;
exports.updateVariantInline = updateVariantInline;
exports.getMonthlyChartData = getMonthlyChartData;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const LOW_STOCK_THRESHOLD = 5;
function getInventoryStats(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            const monthStart = new Date(now);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const [variants, totalProducts, stockHistory, purchases, lowStockProducts, outOfStockProducts,] = yield Promise.all([
                prisma_1.default.productVariant.findMany({
                    where: { isActive: true },
                    select: { id: true, stock: true, purchasePrice: true, productId: true },
                }),
                prisma_1.default.product.count({ where: { isTrashed: false } }),
                prisma_1.default.stockHistory.findMany({
                    where: { createdAt: { gte: monthStart } },
                    select: { action: true, quantity: true, createdAt: true },
                }),
                prisma_1.default.purchase.findMany({
                    where: { createdAt: { gte: monthStart } },
                    select: {
                        totalAmount: true,
                        createdAt: true,
                        status: true,
                        items: { select: { quantity: true } },
                    },
                }),
                prisma_1.default.product.findMany({
                    where: {
                        isTrashed: false,
                        variants: {
                            some: {
                                isActive: true,
                                stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
                            },
                        },
                    },
                    select: {
                        id: true,
                        title: true,
                        variants: {
                            where: {
                                isActive: true,
                                stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
                            },
                            select: { id: true, title: true, sku: true, stock: true },
                        },
                    },
                    take: 10,
                }),
                prisma_1.default.product.findMany({
                    where: {
                        isTrashed: false,
                        variants: { some: { isActive: true, stock: 0 } },
                    },
                    select: {
                        id: true,
                        title: true,
                        variants: {
                            where: { isActive: true, stock: 0 },
                            select: { id: true, title: true, sku: true, stock: true },
                        },
                    },
                    take: 10,
                }),
            ]);
            // Stock overview
            const totalStock = variants.reduce((s, v) => s + v.stock, 0);
            const totalStockValue = variants.reduce((s, v) => s + v.stock * v.purchasePrice, 0);
            const totalVariants = variants.length;
            const uniqueProductIds = new Set(variants.map((v) => v.productId)).size;
            // Stock movement helpers
            function movement(action, since) {
                return stockHistory
                    .filter((h) => h.action === action && new Date(h.createdAt) >= since)
                    .reduce((s, h) => s + h.quantity, 0);
            }
            // Purchase summary helpers
            function purchaseSummary(since) {
                const filtered = purchases.filter((p) => new Date(p.createdAt) >= since);
                return {
                    amount: filtered.reduce((s, p) => s + p.totalAmount, 0),
                    qty: filtered.reduce((s, p) => s + p.items.reduce((a, i) => a + i.quantity, 0), 0),
                    count: filtered.length,
                };
            }
            return res.json({
                stock: {
                    totalStock,
                    totalStockValue,
                    totalProducts,
                    totalVariants,
                    lowStockCount: lowStockProducts.reduce((s, p) => s + p.variants.length, 0),
                    outOfStockCount: outOfStockProducts.reduce((s, p) => s + p.variants.length, 0),
                },
                movement: {
                    daily: {
                        in: movement("ADD", todayStart),
                        out: movement("SALE", todayStart) + movement("REMOVE", todayStart),
                    },
                    weekly: {
                        in: movement("ADD", weekStart),
                        out: movement("SALE", weekStart) + movement("REMOVE", weekStart),
                    },
                    monthly: {
                        in: movement("ADD", monthStart),
                        out: movement("SALE", monthStart) + movement("REMOVE", monthStart),
                    },
                },
                purchase: {
                    total: purchaseSummary(new Date(0)),
                    today: purchaseSummary(todayStart),
                    week: purchaseSummary(weekStart),
                    month: purchaseSummary(monthStart),
                },
                alerts: { lowStockProducts, outOfStockProducts },
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getStockList(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const stockStatus = req.query.stockStatus;
            const where = { isTrashed: false };
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: "insensitive" } },
                    {
                        variants: {
                            some: { sku: { contains: search, mode: "insensitive" } },
                        },
                    },
                ];
            }
            // stock status filter applied via variants post-query for simplicity
            const [products, total] = yield Promise.all([
                prisma_1.default.product.findMany({
                    where,
                    include: {
                        variants: {
                            where: { isActive: true },
                            orderBy: { isDefault: "desc" },
                        },
                    },
                    orderBy: { title: "asc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma_1.default.product.count({ where }),
            ]);
            // filter by stock status if provided
            const filtered = stockStatus
                ? products.filter((p) => {
                    if (stockStatus === "out")
                        return p.variants.some((v) => v.stock === 0);
                    if (stockStatus === "low")
                        return p.variants.some((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD);
                    if (stockStatus === "in")
                        return p.variants.some((v) => v.stock > LOW_STOCK_THRESHOLD);
                    return true;
                })
                : products;
            return res.json({ products: filtered, total });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateVariantInline(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { stock, purchasePrice, regularPrice, salePrice } = req.body;
            const current = yield prisma_1.default.productVariant.findUniqueOrThrow({
                where: { id },
            });
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (stock !== undefined && stock !== current.stock) {
                    const diff = stock - current.stock;
                    yield tx.stockHistory.create({
                        data: {
                            variantId: id,
                            action: "ADJUSTMENT",
                            quantity: Math.abs(diff),
                            note: "Inline stock edit",
                        },
                    });
                }
                yield tx.productVariant.update({
                    where: { id },
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, (stock !== undefined && { stock })), (purchasePrice !== undefined && { purchasePrice })), (regularPrice !== undefined && { regularPrice })), (salePrice !== undefined && { salePrice })),
                });
                // sync parent totalStock
                const agg = yield tx.productVariant.aggregate({
                    where: { productId: current.productId, isActive: true },
                    _sum: { stock: true },
                });
                yield tx.product.update({
                    where: { id: current.productId },
                    data: { totalStock: (_a = agg._sum.stock) !== null && _a !== void 0 ? _a : 0 },
                });
            }));
            return res.json({ message: "Updated" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getMonthlyChartData(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const months = [];
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                const [history, purchaseAmt] = yield Promise.all([
                    prisma_1.default.stockHistory.findMany({
                        where: { createdAt: { gte: start, lt: end } },
                        select: { action: true, quantity: true },
                    }),
                    prisma_1.default.purchase.aggregate({
                        where: { createdAt: { gte: start, lt: end } },
                        _sum: { totalAmount: true },
                    }),
                ]);
                months.push({
                    label: start.toLocaleString("en", { month: "short", year: "2-digit" }),
                    stockIn: history
                        .filter((h) => h.action === "ADD" || h.action === "RETURN")
                        .reduce((s, h) => s + h.quantity, 0),
                    stockOut: history
                        .filter((h) => h.action === "SALE" || h.action === "REMOVE")
                        .reduce((s, h) => s + h.quantity, 0),
                    purchaseAmount: (_a = purchaseAmt._sum.totalAmount) !== null && _a !== void 0 ? _a : 0,
                });
            }
            return res.json({ months });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
