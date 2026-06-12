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
const prisma_1 = require("../../lib/prisma");
function getFinancialLog(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const period = req.query.period || "daily";
            const dateParam = req.query.date;
            const type = req.query.type;
            const sort = req.query.sort === "asc" ? "asc" : "desc";
            // tzOffset: client's UTC offset in minutes (e.g. Bangladesh = -360, meaning UTC+6)
            const tzOffset = parseInt(req.query.tzOffset) || 0;
            // Build start/end in UTC by adjusting for client timezone
            function localMidnight(dateStr, offsetMinutes) {
                // dateStr = "YYYY-MM-DD", offsetMinutes = new Date().getTimezoneOffset() from client
                // getTimezoneOffset returns negative for ahead-of-UTC zones (BD = -360)
                const [y, m, d] = dateStr.split("-").map(Number);
                // Local midnight in UTC = midnight - offset
                return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + offsetMinutes * 60 * 1000);
            }
            function localEndOfDay(dateStr, offsetMinutes) {
                const [y, m, d] = dateStr.split("-").map(Number);
                return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) + offsetMinutes * 60 * 1000);
            }
            const today = dateParam || new Date().toISOString().slice(0, 10);
            let start, end;
            if (period === "weekly") {
                const base = localMidnight(today, tzOffset);
                const day = new Date(base.getTime() - tzOffset * 60 * 1000).getUTCDay();
                start = new Date(base.getTime() - day * 86400000);
                end = new Date(start.getTime() + 6 * 86400000 + 23 * 3600000 + 59 * 60000 + 59999);
            }
            else if (period === "monthly") {
                const [y, m] = today.split("-").map(Number);
                start = localMidnight(`${y}-${String(m).padStart(2, "0")}-01`, tzOffset);
                const lastDay = new Date(y, m, 0).getDate();
                end = localEndOfDay(`${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`, tzOffset);
            }
            else {
                start = localMidnight(today, tzOffset);
                end = localEndOfDay(today, tzOffset);
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
                const purchases = yield prisma_1.prisma.purchase.findMany({
                    where: { date: { gte: start, lte: end } },
                    select: {
                        id: true, totalAmount: true, note: true, date: true, status: true,
                        supplier: { select: { name: true } },
                    },
                });
                for (const p of purchases) {
                    entries.push({
                        id: `expense-${p.id}`,
                        type: "expense",
                        amount: p.totalAmount,
                        note: p.note,
                        date: p.date,
                        ref: `Purchase #${p.id}`,
                        detail: (_b = (_a = p.supplier) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "No supplier",
                    });
                }
            }
            entries.sort((a, b) => sort === "asc"
                ? a.date.getTime() - b.date.getTime()
                : b.date.getTime() - a.date.getTime());
            const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
            const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
            return res.json({
                period,
                start: start.toISOString(),
                end: end.toISOString(),
                summary: { totalIncome, totalExpense, netProfit: totalIncome - totalExpense },
                entries,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
}
