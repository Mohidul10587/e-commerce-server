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
exports.getStockMovementByDateRange = getStockMovementByDateRange;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const dateRange_1 = require("../../lib/dateRange");
const index_1 = require("../../index");
const LOW_STOCK_THRESHOLD = 5; // fallback only for variants without product threshold
function getInventoryStats(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            const monthStart = new Date(now);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const [variants, totalProducts, stockMovement, purchaseStats, allProductsForLowStock, outOfStockProducts,] = yield Promise.all([
                prisma_1.default.productVariant.findMany({
                    where: { isActive: true },
                    select: { id: true, stock: true, purchasePrice: true, productId: true },
                }),
                prisma_1.default.product.count({ where: { isTrashed: false } }),
                prisma_1.default.stockHistory.groupBy({
                    by: ["action"],
                    where: { createdAt: { gte: monthStart } },
                    _sum: { quantity: true },
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
                    where: { isTrashed: false, totalStock: { gt: 0 } },
                    select: {
                        id: true,
                        title: true,
                        lowStockThreshold: true,
                        totalStock: true,
                        variants: {
                            where: { isActive: true, stock: { gt: 0 } },
                            select: { id: true, title: true, sku: true, stock: true },
                        },
                    },
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
            // Build a map for quick action → quantity lookup
            const movementMap = Object.fromEntries(stockMovement.map((g) => { var _a; return [g.action, (_a = g._sum.quantity) !== null && _a !== void 0 ? _a : 0]; }));
            // Stock overview
            const totalStock = variants.reduce((s, v) => s + v.stock, 0);
            const totalStockValue = variants.reduce((s, v) => s + v.stock * v.purchasePrice, 0);
            const totalVariants = variants.length;
            const uniqueProductIds = new Set(variants.map((v) => v.productId)).size;
            // Filter low stock using per-product threshold
            const lowStockProducts = allProductsForLowStock
                .map((p) => (Object.assign(Object.assign({}, p), { variants: p.variants.filter((v) => {
                    const threshold = p.lowStockThreshold > 0 ? p.lowStockThreshold : LOW_STOCK_THRESHOLD;
                    return v.stock > 0 && v.stock <= threshold;
                }) })))
                .filter((p) => p.variants.length > 0)
                .slice(0, 10);
            // Stock movement helpers — use per-action sums from DB groupBy
            // For daily/weekly breakdowns we still need the full history within those sub-ranges.
            // We fetch them lazily only when needed using the already-aggregated map for the monthly total.
            // For daily/weekly we issue two small targeted queries.
            const [dailyMovement, weeklyMovement] = yield Promise.all([
                prisma_1.default.stockHistory.groupBy({
                    by: ["action"],
                    where: { createdAt: { gte: todayStart } },
                    _sum: { quantity: true },
                }),
                prisma_1.default.stockHistory.groupBy({
                    by: ["action"],
                    where: { createdAt: { gte: weekStart } },
                    _sum: { quantity: true },
                }),
            ]);
            const dailyMap = Object.fromEntries(dailyMovement.map((g) => { var _a; return [g.action, (_a = g._sum.quantity) !== null && _a !== void 0 ? _a : 0]; }));
            const weeklyMap = Object.fromEntries(weeklyMovement.map((g) => { var _a; return [g.action, (_a = g._sum.quantity) !== null && _a !== void 0 ? _a : 0]; }));
            const monthlyMap = movementMap;
            // Purchase summary helpers
            function purchaseSummary(since) {
                const filtered = purchaseStats.filter((p) => new Date(p.createdAt) >= since);
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
                        in: (_a = dailyMap["ADD"]) !== null && _a !== void 0 ? _a : 0,
                        out: ((_b = dailyMap["SALE"]) !== null && _b !== void 0 ? _b : 0) + ((_c = dailyMap["REMOVE"]) !== null && _c !== void 0 ? _c : 0),
                    },
                    weekly: {
                        in: (_d = weeklyMap["ADD"]) !== null && _d !== void 0 ? _d : 0,
                        out: ((_e = weeklyMap["SALE"]) !== null && _e !== void 0 ? _e : 0) + ((_f = weeklyMap["REMOVE"]) !== null && _f !== void 0 ? _f : 0),
                    },
                    monthly: {
                        in: (_g = monthlyMap["ADD"]) !== null && _g !== void 0 ? _g : 0,
                        out: ((_h = monthlyMap["SALE"]) !== null && _h !== void 0 ? _h : 0) + ((_j = monthlyMap["REMOVE"]) !== null && _j !== void 0 ? _j : 0),
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
                    const threshold = p.lowStockThreshold > 0 ? p.lowStockThreshold : LOW_STOCK_THRESHOLD;
                    if (stockStatus === "out")
                        return p.variants.some((v) => v.stock === 0);
                    if (stockStatus === "low")
                        return p.variants.some((v) => v.stock > 0 && v.stock <= threshold);
                    if (stockStatus === "in")
                        return p.variants.every((v) => v.stock > threshold);
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
            index_1.io.emit("inventory:updated", { variantId: id, productId: current.productId });
            return res.json({ message: "Updated" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getMonthlyChartData(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const now = new Date();
            // Build all date ranges upfront
            const ranges = Array.from({ length: 6 }, (_, idx) => {
                const i = 5 - idx;
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                const label = start.toLocaleString("en", { month: "short", year: "2-digit" });
                return { start, end, label };
            });
            // Fire all 12 queries at once
            const queries = ranges.flatMap(({ start, end }) => [
                prisma_1.default.stockHistory.findMany({
                    where: { createdAt: { gte: start, lt: end } },
                    select: { action: true, quantity: true },
                }),
                prisma_1.default.purchase.aggregate({
                    where: { createdAt: { gte: start, lt: end } },
                    _sum: { totalAmount: true },
                }),
            ]);
            const results = yield Promise.all(queries);
            const months = ranges.map(({ label }, idx) => {
                var _a;
                const history = results[idx * 2];
                const purchaseAmt = results[idx * 2 + 1];
                return {
                    label,
                    stockIn: history
                        .filter((h) => h.action === "ADD" || h.action === "RETURN")
                        .reduce((s, h) => s + h.quantity, 0),
                    stockOut: history
                        .filter((h) => h.action === "SALE" || h.action === "REMOVE")
                        .reduce((s, h) => s + h.quantity, 0),
                    purchaseAmount: (_a = purchaseAmt._sum.totalAmount) !== null && _a !== void 0 ? _a : 0,
                };
            });
            return res.json({ months });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getStockMovementByDateRange(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate)
                return res.status(400).json({ message: "startDate and endDate are required" });
            const tzOffset = parseInt(req.query.tzOffset) || 0;
            const { gte: start } = (0, dateRange_1.localDayRange)(startDate, tzOffset);
            const { lte: end } = (0, dateRange_1.localDayRange)(endDate, tzOffset);
            const [history, orderedPurchases, receivedPurchases] = yield Promise.all([
                prisma_1.default.stockHistory.findMany({
                    where: { createdAt: { gte: start, lte: end } },
                    select: { action: true, quantity: true },
                }),
                prisma_1.default.purchase.findMany({
                    where: {
                        isTrashed: false,
                        status: "Ordered",
                        date: { gte: start, lte: end },
                    },
                    select: { purchaseMoney: true, items: { select: { quantity: true } } },
                }),
                prisma_1.default.purchase.findMany({
                    where: {
                        isTrashed: false,
                        status: "Received",
                        receivedAt: { gte: start, lte: end },
                    },
                    select: { purchaseMoney: true, items: { select: { quantity: true } } },
                }),
            ]);
            const stockOut = history
                .filter((h) => h.action === "SALE" || h.action === "REMOVE")
                .reduce((sum, h) => sum + h.quantity, 0);
            const stockIn = receivedPurchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0), 0);
            const purchaseAmount = [...orderedPurchases, ...receivedPurchases].reduce((sum, p) => { var _a; return sum + ((_a = p.purchaseMoney) !== null && _a !== void 0 ? _a : 0); }, 0);
            return res.json({ stockIn, stockOut, purchaseAmount });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
