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
exports.getFinancialLog = getFinancialLog;
exports.getPurchaseCostReport = getPurchaseCostReport;
const prisma_1 = require("../../lib/prisma");
function getFinancialLog(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const type = req.query.type;
            const sort = req.query.sort === "asc" ? "asc" : "desc";
            const tzOffset = parseInt(req.query.tzOffset) || 0;
            function localMidnight(dateStr, offsetMinutes) {
                const [y, m, d] = dateStr.split("-").map(Number);
                return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + offsetMinutes * 60 * 1000);
            }
            function localEndOfDay(dateStr, offsetMinutes) {
                const [y, m, d] = dateStr.split("-").map(Number);
                return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) + offsetMinutes * 60 * 1000);
            }
            // Support startDate/endDate directly (new pattern)
            const startDateParam = req.query.startDate;
            const endDateParam = req.query.endDate;
            let start, end;
            if (startDateParam && endDateParam) {
                start = localMidnight(startDateParam, tzOffset);
                end = localEndOfDay(endDateParam, tzOffset);
            }
            else {
                // Legacy period+date fallback
                const period = req.query.period || "daily";
                const dateParam = req.query.date || new Date().toISOString().slice(0, 10);
                if (period === "weekly") {
                    const base = localMidnight(dateParam, tzOffset);
                    const day = new Date(base.getTime() - tzOffset * 60 * 1000).getUTCDay();
                    start = new Date(base.getTime() - day * 86400000);
                    end = new Date(start.getTime() + 6 * 86400000 + 23 * 3600000 + 59 * 60000 + 59999);
                }
                else if (period === "monthly") {
                    const [y, m] = dateParam.split("-").map(Number);
                    start = localMidnight(`${y}-${String(m).padStart(2, "0")}-01`, tzOffset);
                    const lastDay = new Date(y, m, 0).getDate();
                    end = localEndOfDay(`${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`, tzOffset);
                }
                else {
                    start = localMidnight(dateParam, tzOffset);
                    end = localEndOfDay(dateParam, tzOffset);
                }
            }
            const entries = [];
            if (!type || type === "income") {
                const txns = yield prisma_1.prisma.paymentTransaction.findMany({
                    where: { createdAt: { gte: start, lte: end }, order: { isTrashed: false } },
                    select: {
                        id: true, amount: true, note: true, createdAt: true,
                        order: { select: { id: true, customerName: true, customerPhone: true } },
                    },
                });
                for (const t of txns) {
                    entries.push({
                        id: `income-${t.id}`,
                        type: "income",
                        amount: t.amount,
                        note: t.note,
                        date: t.createdAt,
                        ref: `Order #${t.order.id}`,
                        detail: `${t.order.customerName} (${t.order.customerPhone})`,
                    });
                }
            }
            if (!type || type === "expense") {
                const [officeExpenses, marketingExpenses, payrolls] = yield Promise.all([
                    prisma_1.prisma.officeExpense.findMany({
                        where: { createdAt: { gte: start, lte: end }, isTrashed: false },
                        select: { id: true, amount: true, note: true, createdAt: true, category: { select: { name: true } } },
                    }),
                    prisma_1.prisma.marketingExpense.findMany({
                        where: { createdAt: { gte: start, lte: end }, isTrashed: false },
                        select: { id: true, amount: true, note: true, createdAt: true, category: { select: { name: true } } },
                    }),
                    prisma_1.prisma.payroll.findMany({
                        where: { paidAt: { gte: start, lte: end }, status: "Paid", isTrashed: false },
                        select: { id: true, totalPayable: true, salaryMonth: true, paidAt: true, employeeId: true },
                    }),
                ]);
                for (const e of officeExpenses) {
                    entries.push({ id: `office-${e.id}`, type: "expense", amount: e.amount, note: e.note, date: e.createdAt, ref: `Office Expense #${e.id}`, detail: e.category.name });
                }
                for (const e of marketingExpenses) {
                    entries.push({ id: `marketing-${e.id}`, type: "expense", amount: e.amount, note: e.note, date: e.createdAt, ref: `Marketing Expense #${e.id}`, detail: e.category.name });
                }
                for (const p of payrolls) {
                    entries.push({ id: `payroll-${p.id}`, type: "expense", amount: p.totalPayable, note: `Salary ${p.salaryMonth}`, date: p.paidAt, ref: `Payroll #${p.id}`, detail: `Employee #${p.employeeId}` });
                }
            }
            entries.sort((a, b) => sort === "asc"
                ? a.date.getTime() - b.date.getTime()
                : b.date.getTime() - a.date.getTime());
            const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
            const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
            const officeExpenseCost = entries.filter(e => e.id.startsWith("office-")).reduce((s, e) => s + e.amount, 0);
            const marketingExpenseCost = entries.filter(e => e.id.startsWith("marketing-")).reduce((s, e) => s + e.amount, 0);
            const salaryCost = entries.filter(e => e.id.startsWith("payroll-")).reduce((s, e) => s + e.amount, 0);
            // COGS: purchasePrice × qty for all delivered order items (all-time, matches Purchase Cost page)
            const deliveredItems = yield prisma_1.prisma.orderItem.findMany({
                where: { order: { isTrashed: false, status: "Delivered" }, isFreeItem: false },
                select: { variantId: true, quantity: true },
            });
            const variantIds = [...new Set(deliveredItems.map(i => i.variantId))];
            const variants = variantIds.length ? yield prisma_1.prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, purchasePrice: true },
            }) : [];
            const priceMap = Object.fromEntries(variants.map(v => { var _a; return [v.id, (_a = v.purchasePrice) !== null && _a !== void 0 ? _a : 0]; }));
            const purchaseCost = deliveredItems.reduce((s, i) => { var _a; return s + ((_a = priceMap[i.variantId]) !== null && _a !== void 0 ? _a : 0) * i.quantity; }, 0);
            return res.json({
                start: start.toISOString(),
                end: end.toISOString(),
                summary: { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, purchaseCost, officeExpenseCost, marketingExpenseCost, salaryCost },
                entries,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
}
function getPurchaseCostReport(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // Get all items from Delivered orders (not trashed)
            const items = yield prisma_1.prisma.orderItem.findMany({
                where: {
                    order: { isTrashed: false, status: "Delivered" },
                    isFreeItem: false,
                },
                select: {
                    variantId: true,
                    title: true,
                    quantity: true,
                },
            });
            // Get purchase prices for all variants involved
            const variantIds = [...new Set(items.map((i) => i.variantId))];
            const variants = yield prisma_1.prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, purchasePrice: true },
            });
            const priceMap = Object.fromEntries(variants.map((v) => [v.id, v.purchasePrice]));
            // Aggregate by variantId + title
            const map = new Map();
            for (const item of items) {
                const existing = map.get(item.variantId);
                const pp = (_a = priceMap[item.variantId]) !== null && _a !== void 0 ? _a : 0;
                if (existing) {
                    existing.qty += item.quantity;
                }
                else {
                    map.set(item.variantId, { title: item.title, qty: item.quantity, purchasePrice: pp });
                }
            }
            const rows = [...map.entries()]
                .map(([variantId, d], i) => ({
                variantId,
                title: d.title,
                totalQty: d.qty,
                purchasePricePerUnit: d.purchasePrice,
                totalPurchaseCost: d.qty * d.purchasePrice,
            }))
                .sort((a, b) => b.totalPurchaseCost - a.totalPurchaseCost)
                .map((r, i) => (Object.assign(Object.assign({}, r), { rank: i + 1 })));
            const top10 = rows.slice(0, 10);
            const grandTotal = rows.reduce((s, r) => s + r.totalPurchaseCost, 0);
            return res.json({ rows, top10, grandTotal, total: rows.length });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
}
