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
// GET /finances/log?period=daily|weekly|monthly&date=YYYY-MM-DD
function getFinancialLog(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const period = req.query.period || "daily";
            const dateParam = req.query.date;
            const now = dateParam ? new Date(dateParam) : new Date();
            let start;
            let end;
            if (period === "weekly") {
                const day = now.getDay(); // 0=Sun
                start = new Date(now);
                start.setDate(now.getDate() - day);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
            }
            else if (period === "monthly") {
                start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            else {
                // daily
                start = new Date(now);
                start.setHours(0, 0, 0, 0);
                end = new Date(now);
                end.setHours(23, 59, 59, 999);
            }
            // Income: orders where payment was recorded (paidAt) in this period
            const orders = yield prisma_1.prisma.order.findMany({
                where: {
                    isTrashed: false,
                    paymentStatus: { not: "unpaid" },
                    paidAt: { gte: start, lte: end },
                },
                select: {
                    id: true,
                    customerName: true,
                    customerPhone: true,
                    total: true,
                    paidAmount: true,
                    paymentStatus: true,
                    paidAt: true,
                },
                orderBy: { paidAt: "desc" },
            });
            // Expense: purchases received in this period
            const purchases = yield prisma_1.prisma.purchase.findMany({
                where: {
                    date: { gte: start, lte: end },
                },
                select: {
                    id: true,
                    date: true,
                    totalAmount: true,
                    status: true,
                    note: true,
                    supplier: { select: { id: true, name: true } },
                },
                orderBy: { date: "desc" },
            });
            const totalIncome = orders.reduce((s, o) => s + o.paidAmount, 0);
            const totalExpense = purchases.reduce((s, p) => s + p.totalAmount, 0);
            return res.json({
                period,
                start: start.toISOString(),
                end: end.toISOString(),
                summary: {
                    totalIncome,
                    totalExpense,
                    netProfit: totalIncome - totalExpense,
                },
                incomeEntries: orders,
                expenseEntries: purchases,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
}
