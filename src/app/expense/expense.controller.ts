import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { buildDateFilter } from "../../lib/dateRange";

async function logActivity(action: string, entity: string, entityId: number, note?: string, amount?: number) {
  await prisma.financialActivityLog.create({ data: { action, entity, entityId, note, amount } });
}

function buildDateRange(type: "today" | "month") {
  const now = new Date();
  if (type === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86400000 - 1);
    return { gte: start, lte: end };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { gte: start, lte: end };
}

// ── Expense Summary ──────────────────────────────────────────────────────────

export async function getExpenseSummary(_req: Request, res: Response) {
  try {
    const todayRange = buildDateRange("today");
    const monthRange = buildDateRange("month");

    const [totalOffice, todayOffice, monthOffice, totalMarketing, todayMarketing, monthMarketing] = await Promise.all([
      prisma.officeExpense.aggregate({ where: { isTrashed: false }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { isTrashed: false, createdAt: todayRange }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { isTrashed: false, createdAt: monthRange }, _sum: { amount: true } }),
      prisma.marketingExpense.aggregate({ where: { isTrashed: false }, _sum: { amount: true } }),
      prisma.marketingExpense.aggregate({ where: { isTrashed: false, createdAt: todayRange }, _sum: { amount: true } }),
      prisma.marketingExpense.aggregate({ where: { isTrashed: false, createdAt: monthRange }, _sum: { amount: true } }),
    ]);

    const to = totalOffice._sum.amount ?? 0;
    const dyo = todayOffice._sum.amount ?? 0;
    const mto = monthOffice._sum.amount ?? 0;
    const tm = totalMarketing._sum.amount ?? 0;
    const dym = todayMarketing._sum.amount ?? 0;
    const mtm = monthMarketing._sum.amount ?? 0;

    return res.json({
      office: { total: to, thisMonth: mto, today: dyo },
      marketing: { total: tm, thisMonth: mtm, today: dym },
      combined: { total: to + tm, thisMonth: mto + mtm, today: dyo + dym },
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

// ── Financial Activity Log ───────────────────────────────────────────────────

export async function getFinancialActivityLog(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const entity = req.query.entity as string | undefined;

    const where: any = {};
    if (entity) where.entity = entity;
    if (search) where.OR = [
      { note: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
      { entity: { contains: search, mode: "insensitive" } },
    ];

    const [logs, total] = await Promise.all([
      prisma.financialActivityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialActivityLog.count({ where }),
    ]);

    return res.json({ logs, total });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

// ── Office Expense Categories ────────────────────────────────────────────────

export async function listOfficeExpenseCategories(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const trash = req.query.trash === "true";

    const where: any = { isTrashed: trash };
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.officeExpenseCategory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.officeExpenseCategory.count({ where }),
    ]);
    return res.json({ items, total });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function createOfficeExpenseCategory(req: Request, res: Response) {
  try {
    const { name, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const item = await prisma.officeExpenseCategory.create({ data: { name: name.trim(), status: status || "active" } });
    await logActivity("CREATE", "OfficeExpenseCategory", item.id, name.trim());
    return res.status(201).json({ item });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function updateOfficeExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { name, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const item = await prisma.officeExpenseCategory.update({ where: { id }, data: { name: name.trim(), status } });
    await logActivity("UPDATE", "OfficeExpenseCategory", id, name.trim());
    return res.json({ item });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function trashOfficeExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.officeExpenseCategory.update({ where: { id }, data: { isTrashed: true } });
    await logActivity("TRASH", "OfficeExpenseCategory", id);
    return res.json({ message: "Moved to trash" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function restoreOfficeExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.officeExpenseCategory.update({ where: { id }, data: { isTrashed: false } });
    await logActivity("RESTORE", "OfficeExpenseCategory", id);
    return res.json({ message: "Restored" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function permanentDeleteOfficeExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.officeExpenseCategory.delete({ where: { id } });
    await logActivity("PERMANENT_DELETE", "OfficeExpenseCategory", id);
    return res.json({ message: "Permanently deleted" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

// ── Marketing Expense Categories ─────────────────────────────────────────────

export async function listMarketingExpenseCategories(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const trash = req.query.trash === "true";

    const where: any = { isTrashed: trash };
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.marketingExpenseCategory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.marketingExpenseCategory.count({ where }),
    ]);
    return res.json({ items, total });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function createMarketingExpenseCategory(req: Request, res: Response) {
  try {
    const { name, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const item = await prisma.marketingExpenseCategory.create({ data: { name: name.trim(), status: status || "active" } });
    await logActivity("CREATE", "MarketingExpenseCategory", item.id, name.trim());
    return res.status(201).json({ item });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function updateMarketingExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { name, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const item = await prisma.marketingExpenseCategory.update({ where: { id }, data: { name: name.trim(), status } });
    await logActivity("UPDATE", "MarketingExpenseCategory", id, name.trim());
    return res.json({ item });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function trashMarketingExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.marketingExpenseCategory.update({ where: { id }, data: { isTrashed: true } });
    await logActivity("TRASH", "MarketingExpenseCategory", id);
    return res.json({ message: "Moved to trash" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function restoreMarketingExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.marketingExpenseCategory.update({ where: { id }, data: { isTrashed: false } });
    await logActivity("RESTORE", "MarketingExpenseCategory", id);
    return res.json({ message: "Restored" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function permanentDeleteMarketingExpenseCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.marketingExpenseCategory.delete({ where: { id } });
    await logActivity("PERMANENT_DELETE", "MarketingExpenseCategory", id);
    return res.json({ message: "Permanently deleted" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

// ── Office Expenses ──────────────────────────────────────────────────────────

export async function listOfficeExpenses(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const trash = req.query.trash === "true";
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined;
    const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined;

    const where: any = { isTrashed: trash };
    if (categoryId) where.categoryId = categoryId;
    if (amountMin !== undefined || amountMax !== undefined) {
      where.amount = {};
      if (amountMin !== undefined) where.amount.gte = amountMin;
      if (amountMax !== undefined) where.amount.lte = amountMax;
    }
    const tzOffset = parseInt(req.query.tzOffset as string) || 0;
    const dateFilter = buildDateFilter(
      req.query.dateFrom as string | undefined,
      req.query.dateTo as string | undefined,
      tzOffset
    );
    if (dateFilter) where.createdAt = dateFilter;
    if (search) where.OR = [
      { note: { contains: search, mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];

    const [expenses, total] = await Promise.all([
      prisma.officeExpense.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.officeExpense.count({ where }),
    ]);
    return res.json({ expenses, total });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function createOfficeExpense(req: Request, res: Response) {
  try {
    const { categoryId, note, amount } = req.body;
    if (!categoryId) return res.status(400).json({ message: "Category is required" });
    if (!note?.trim()) return res.status(400).json({ message: "Note is required" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
    const expense = await prisma.officeExpense.create({
      data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
      include: { category: { select: { id: true, name: true } } },
    });
    await logActivity("CREATE", "OfficeExpense", expense.id, note.trim(), parseFloat(amount));
    return res.status(201).json({ expense });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function updateOfficeExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, note, amount } = req.body;
    if (!categoryId) return res.status(400).json({ message: "Category is required" });
    if (!note?.trim()) return res.status(400).json({ message: "Note is required" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
    const expense = await prisma.officeExpense.update({
      where: { id },
      data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
      include: { category: { select: { id: true, name: true } } },
    });
    await logActivity("UPDATE", "OfficeExpense", id, note.trim(), parseFloat(amount));
    return res.json({ expense });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function trashOfficeExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.officeExpense.update({ where: { id }, data: { isTrashed: true } });
    await logActivity("TRASH", "OfficeExpense", id);
    return res.json({ message: "Moved to trash" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function restoreOfficeExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.officeExpense.update({ where: { id }, data: { isTrashed: false } });
    await logActivity("RESTORE", "OfficeExpense", id);
    return res.json({ message: "Restored" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function permanentDeleteOfficeExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.officeExpense.delete({ where: { id } });
    await logActivity("PERMANENT_DELETE", "OfficeExpense", id);
    return res.json({ message: "Permanently deleted" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

// ── Marketing Expenses ───────────────────────────────────────────────────────

export async function listMarketingExpenses(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const trash = req.query.trash === "true";
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined;
    const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined;

    const where: any = { isTrashed: trash };
    if (categoryId) where.categoryId = categoryId;
    if (amountMin !== undefined || amountMax !== undefined) {
      where.amount = {};
      if (amountMin !== undefined) where.amount.gte = amountMin;
      if (amountMax !== undefined) where.amount.lte = amountMax;
    }
    const tzOffset = parseInt(req.query.tzOffset as string) || 0;
    const dateFilter = buildDateFilter(dateFrom, dateTo, tzOffset);
    if (dateFilter) where.createdAt = dateFilter;
    if (search) where.OR = [
      { note: { contains: search, mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];

    const [expenses, total] = await Promise.all([
      prisma.marketingExpense.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketingExpense.count({ where }),
    ]);
    return res.json({ expenses, total });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function createMarketingExpense(req: Request, res: Response) {
  try {
    const { categoryId, note, amount } = req.body;
    if (!categoryId) return res.status(400).json({ message: "Category is required" });
    if (!note?.trim()) return res.status(400).json({ message: "Note is required" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
    const expense = await prisma.marketingExpense.create({
      data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
      include: { category: { select: { id: true, name: true } } },
    });
    await logActivity("CREATE", "MarketingExpense", expense.id, note.trim(), parseFloat(amount));
    return res.status(201).json({ expense });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function updateMarketingExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, note, amount } = req.body;
    if (!categoryId) return res.status(400).json({ message: "Category is required" });
    if (!note?.trim()) return res.status(400).json({ message: "Note is required" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
    const expense = await prisma.marketingExpense.update({
      where: { id },
      data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
      include: { category: { select: { id: true, name: true } } },
    });
    await logActivity("UPDATE", "MarketingExpense", id, note.trim(), parseFloat(amount));
    return res.json({ expense });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function trashMarketingExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.marketingExpense.update({ where: { id }, data: { isTrashed: true } });
    await logActivity("TRASH", "MarketingExpense", id);
    return res.json({ message: "Moved to trash" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function restoreMarketingExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.marketingExpense.update({ where: { id }, data: { isTrashed: false } });
    await logActivity("RESTORE", "MarketingExpense", id);
    return res.json({ message: "Restored" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}

export async function permanentDeleteMarketingExpense(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.marketingExpense.delete({ where: { id } });
    await logActivity("PERMANENT_DELETE", "MarketingExpense", id);
    return res.json({ message: "Permanently deleted" });
  } catch { return res.status(500).json({ message: "Server error" }); }
}
