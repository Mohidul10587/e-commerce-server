import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export async function getFinancialLog(req: Request, res: Response) {
  try {
    const type = req.query.type as string | undefined;
    const sort = req.query.sort === "asc" ? "asc" : "desc";
    const tzOffset = parseInt(req.query.tzOffset as string) || 0;

    function localMidnight(dateStr: string, offsetMinutes: number): Date {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + offsetMinutes * 60 * 1000);
    }
    function localEndOfDay(dateStr: string, offsetMinutes: number): Date {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) + offsetMinutes * 60 * 1000);
    }

    // Support startDate/endDate directly (new pattern)
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;

    let start: Date, end: Date;

    if (startDateParam && endDateParam) {
      start = localMidnight(startDateParam, tzOffset);
      end = localEndOfDay(endDateParam, tzOffset);
    } else {
      // Legacy period+date fallback
      const period = (req.query.period as string) || "daily";
      const dateParam = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      if (period === "weekly") {
        const base = localMidnight(dateParam, tzOffset);
        const day = new Date(base.getTime() - tzOffset * 60 * 1000).getUTCDay();
        start = new Date(base.getTime() - day * 86400000);
        end = new Date(start.getTime() + 6 * 86400000 + 23 * 3600000 + 59 * 60000 + 59999);
      } else if (period === "monthly") {
        const [y, m] = dateParam.split("-").map(Number);
        start = localMidnight(`${y}-${String(m).padStart(2, "0")}-01`, tzOffset);
        const lastDay = new Date(y, m, 0).getDate();
        end = localEndOfDay(`${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`, tzOffset);
      } else {
        start = localMidnight(dateParam, tzOffset);
        end = localEndOfDay(dateParam, tzOffset);
      }
    }

    const entries: {
      id: string;
      type: "income" | "expense";
      amount: number;
      note: string | null;
      date: Date;
      ref: string;
      detail: string;
    }[] = [];

    if (!type || type === "income") {
      const txns = await prisma.paymentTransaction.findMany({
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
      const [officeExpenses, marketingExpenses, payrolls] = await Promise.all([
        prisma.officeExpense.findMany({
          where: { createdAt: { gte: start, lte: end }, isTrashed: false },
          select: { id: true, amount: true, note: true, createdAt: true, category: { select: { name: true } } },
        }),
        prisma.marketingExpense.findMany({
          where: { createdAt: { gte: start, lte: end }, isTrashed: false },
          select: { id: true, amount: true, note: true, createdAt: true, category: { select: { name: true } } },
        }),
        prisma.payroll.findMany({
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
        entries.push({ id: `payroll-${p.id}`, type: "expense", amount: p.totalPayable, note: `Salary ${p.salaryMonth}`, date: p.paidAt!, ref: `Payroll #${p.id}`, detail: `Employee #${p.employeeId}` });
      }
    }

    entries.sort((a, b) =>
      sort === "asc"
        ? a.date.getTime() - b.date.getTime()
        : b.date.getTime() - a.date.getTime()
    );

    const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);

    const officeExpenseCost = entries.filter(e => e.id.startsWith("office-")).reduce((s, e) => s + e.amount, 0);
    const marketingExpenseCost = entries.filter(e => e.id.startsWith("marketing-")).reduce((s, e) => s + e.amount, 0);
    const salaryCost = entries.filter(e => e.id.startsWith("payroll-")).reduce((s, e) => s + e.amount, 0);

    // Purchase cost: sum of purchaseMoney paid to suppliers for received purchases within date range
    const purchases = await prisma.purchase.findMany({
      where: { isTrashed: false, status: "Received", date: { gte: start, lte: end } },
      select: { purchaseMoney: true },
    });
    const purchaseCost = purchases.reduce((s, p) => s + (p.purchaseMoney ?? 0), 0);

    return res.json({
      start: start.toISOString(),
      end: end.toISOString(),
      summary: {
        totalIncome,
        totalExpense: totalExpense + purchaseCost,
        netProfit: totalIncome - totalExpense - purchaseCost,
        purchaseCost,
        officeExpenseCost,
        marketingExpenseCost,
        salaryCost,
        paymentTransactionCount: entries.filter(e => e.type === "income").length,
      },
      entries,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getPurchaseCostReport(req: Request, res: Response) {
  try {
    const tzOffset = parseInt(req.query.tzOffset as string) || 0;
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;

    const dateFilter: any = {};
    if (startDateParam && endDateParam) {
      const [sy, sm, sd] = startDateParam.split("-").map(Number);
      const [ey, em, ed] = endDateParam.split("-").map(Number);
      dateFilter.gte = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0) + tzOffset * 60 * 1000);
      dateFilter.lte = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999) + tzOffset * 60 * 1000);
    }

    const purchaseWhere = {
      isTrashed: false,
      status: "Received" as const,
      ...(dateFilter.gte ? { date: dateFilter } : {}),
    };

    const purchases = await prisma.purchase.findMany({
      where: purchaseWhere,
      select: {
        id: true,
        date: true,
        purchaseMoney: true,
        totalAmount: true,
        supplier: { select: { name: true } },
        items: { select: { productTitle: true, variantTitle: true, quantity: true, purchasePrice: true } },
      },
      orderBy: { date: "desc" },
    });

    const rows = purchases.map((p, i) => ({
      rank: i + 1,
      purchaseId: p.id,
      date: p.date,
      supplier: p.supplier?.name ?? "—",
      itemSummary: p.items.map(it => `${it.productTitle} - ${it.variantTitle} (×${it.quantity})`).join(", "),
      totalAmount: p.totalAmount,
      purchaseMoney: p.purchaseMoney ?? 0,
    }));

    const grandTotal = rows.reduce((s, r) => s + r.purchaseMoney, 0);

    return res.json({ rows, grandTotal, total: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
