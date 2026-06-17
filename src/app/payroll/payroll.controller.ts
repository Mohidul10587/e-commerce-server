import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { buildDateFilter } from "../../lib/dateRange";

const EMPLOYEE_ROLES = { not: "customer" } as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function logFinancial(entityId: number, amount: number, note: string) {
  await prisma.financialActivityLog.create({
    data: { action: "PAID", entity: "Payroll", entityId, note, amount },
  });
}

// ── Employees (users where role != customer) ──────────────────────────────────

export async function getEmployees(_req: Request, res: Response) {
  try {
    const employees = await prisma.user.findMany({
      where: { role: { not: "customer" }, isTrashed: false },
      select: { id: true, name: true, role: true, basicSalary: true, overtime: true, ta: true, bonus: true },
      orderBy: { name: "asc" },
    });
    return res.json({ employees });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

// ── Payroll CRUD ─────────────────────────────────────────────────────────────

export async function listPayrolls(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const trash = req.query.trash === "true";
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const role = req.query.role as string | undefined;
    const month = req.query.month as string | undefined;  // "MM"
    const year = req.query.year as string | undefined;    // "YYYY"
    const status = req.query.status as string | undefined;

    const where: any = { isTrashed: trash };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (month && year) where.salaryMonth = `${year}-${month.padStart(2, "0")}`;
    else if (year) where.salaryMonth = { startsWith: year };
    else if (month) where.salaryMonth = { endsWith: `-${month.padStart(2, "0")}` };

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const tzOffset = parseInt(req.query.tzOffset as string) || 0;
    const dateFilter = buildDateFilter(startDate, endDate, tzOffset);
    if (dateFilter) where.createdAt = dateFilter;

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        orderBy: [{ salaryMonth: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payroll.count({ where }),
    ]);

    // Attach employee info
    const employeeIds = [...new Set(payrolls.map((p) => p.employeeId))];
    const users = await prisma.user.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true, role: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    // Filter by role if requested
    let result = payrolls.map((p) => ({ ...p, employee: userMap[p.employeeId] ?? null }));
    if (role) result = result.filter((p) => p.employee?.role === role);

    return res.json({ payrolls: result, total: role ? result.length : total });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function generatePayrolls(req: Request, res: Response) {
  try {
    const { salaryMonth } = req.body; // "YYYY-MM"
    if (!salaryMonth || !/^\d{4}-\d{2}$/.test(salaryMonth))
      return res.status(400).json({ message: "salaryMonth is required in YYYY-MM format" });

    const employees = await prisma.user.findMany({
      where: { role: { not: "customer" }, isTrashed: false },
      select: { id: true, basicSalary: true, overtime: true, ta: true, bonus: true },
    });

    if (employees.length === 0)
      return res.status(400).json({ message: "No employees found" });

    // Skip employees that already have a payroll for this month
    const existing = await prisma.payroll.findMany({
      where: { salaryMonth, isTrashed: false },
      select: { employeeId: true },
    });
    const existingIds = new Set(existing.map((e) => e.employeeId));
    const toCreate = employees.filter((e) => !existingIds.has(e.id));

    if (toCreate.length === 0)
      return res.status(400).json({ message: "Payroll already generated for all employees this month" });

    const created = await prisma.payroll.createMany({
      data: toCreate.map((e) => ({
        employeeId: e.id,
        salaryMonth,
        basicSalary: e.basicSalary,
        overtime: e.overtime,
        ta: e.ta,
        bonus: e.bonus,
        totalPayable: e.basicSalary + e.overtime + e.ta + e.bonus,
        status: "Pending",
      })),
    });

    return res.status(201).json({ generated: created.count, skipped: existingIds.size });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createPayroll(req: Request, res: Response) {
  try {
    const { employeeId, salaryMonth, basicSalary, overtime = 0, ta = 0, bonus = 0, note } = req.body;
    if (!employeeId || !salaryMonth || !basicSalary)
      return res.status(400).json({ message: "employeeId, salaryMonth and basicSalary are required" });

    const totalPayable = parseFloat(basicSalary) + parseFloat(overtime) + parseFloat(ta) + parseFloat(bonus);
    const payroll = await prisma.payroll.create({
      data: {
        employeeId: parseInt(employeeId),
        salaryMonth,
        basicSalary: parseFloat(basicSalary),
        overtime: parseFloat(overtime),
        ta: parseFloat(ta),
        bonus: parseFloat(bonus),
        totalPayable,
        note: note || null,
      },
    });
    return res.status(201).json({ payroll });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updatePayroll(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { employeeId, salaryMonth, basicSalary, overtime = 0, ta = 0, bonus = 0, note } = req.body;
    if (!employeeId || !salaryMonth || !basicSalary)
      return res.status(400).json({ message: "employeeId, salaryMonth and basicSalary are required" });

    const totalPayable = parseFloat(basicSalary) + parseFloat(overtime) + parseFloat(ta) + parseFloat(bonus);
    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        employeeId: parseInt(employeeId),
        salaryMonth,
        basicSalary: parseFloat(basicSalary),
        overtime: parseFloat(overtime),
        ta: parseFloat(ta),
        bonus: parseFloat(bonus),
        totalPayable,
        note: note || null,
      },
    });
    return res.json({ payroll });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function revertToPending(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const payroll = await prisma.payroll.update({
      where: { id },
      data: { status: "Pending", paidAt: null },
    });
    return res.json({ payroll });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function markAsPaid(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const payroll = await prisma.payroll.update({
      where: { id },
      data: { status: "Paid", paidAt: new Date() },
    });
    await logFinancial(id, payroll.totalPayable, `Payroll #${id} — ${payroll.salaryMonth}`);
    return res.json({ payroll });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function trashPayroll(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.payroll.update({ where: { id }, data: { isTrashed: true } });
    return res.json({ message: "Moved to trash" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function restorePayroll(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.payroll.update({ where: { id }, data: { isTrashed: false } });
    return res.json({ message: "Restored" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function permanentDeletePayroll(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.payroll.delete({ where: { id } });
    return res.json({ message: "Permanently deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

export async function getPayrollSummary(req: Request, res: Response) {
  try {
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;

    const where: any = { isTrashed: false, status: "Paid" };
    if (month && year) where.salaryMonth = `${year}-${month.padStart(2, "0")}`;
    else if (year) where.salaryMonth = { startsWith: year };

    const agg = await prisma.payroll.aggregate({
      where,
      _sum: { basicSalary: true, overtime: true, ta: true, bonus: true, totalPayable: true },
      _count: { id: true },
    });

    // Unique employees
    const paid = await prisma.payroll.findMany({ where, select: { employeeId: true } });
    const uniqueEmployees = new Set(paid.map((p) => p.employeeId)).size;

    return res.json({
      totalEmployees: uniqueEmployees,
      totalSalary: agg._sum.basicSalary ?? 0,
      totalOvertime: agg._sum.overtime ?? 0,
      totalTA: agg._sum.ta ?? 0,
      totalBonus: agg._sum.bonus ?? 0,
      totalPayroll: agg._sum.totalPayable ?? 0,
      count: agg._count.id,
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}
