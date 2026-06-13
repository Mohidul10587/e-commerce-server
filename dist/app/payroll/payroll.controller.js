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
exports.getEmployees = getEmployees;
exports.listPayrolls = listPayrolls;
exports.createPayroll = createPayroll;
exports.updatePayroll = updatePayroll;
exports.markAsPaid = markAsPaid;
exports.trashPayroll = trashPayroll;
exports.restorePayroll = restorePayroll;
exports.permanentDeletePayroll = permanentDeletePayroll;
exports.getPayrollSummary = getPayrollSummary;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const EMPLOYEE_ROLES = { not: "customer" };
// ── Helpers ──────────────────────────────────────────────────────────────────
function logFinancial(entityId, amount, note) {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma_1.default.financialActivityLog.create({
            data: { action: "PAID", entity: "Payroll", entityId, note, amount },
        });
    });
}
// ── Employees (users where role != customer) ──────────────────────────────────
function getEmployees(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const employees = yield prisma_1.default.user.findMany({
                where: { role: { not: "customer" }, isTrashed: false },
                select: { id: true, name: true, role: true },
                orderBy: { name: "asc" },
            });
            return res.json({ employees });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
// ── Payroll CRUD ─────────────────────────────────────────────────────────────
function listPayrolls(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const trash = req.query.trash === "true";
            const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : undefined;
            const role = req.query.role;
            const month = req.query.month; // "MM"
            const year = req.query.year; // "YYYY"
            const status = req.query.status;
            const where = { isTrashed: trash };
            if (employeeId)
                where.employeeId = employeeId;
            if (status)
                where.status = status;
            if (month && year)
                where.salaryMonth = `${year}-${month.padStart(2, "0")}`;
            else if (year)
                where.salaryMonth = { startsWith: year };
            else if (month)
                where.salaryMonth = { endsWith: `-${month.padStart(2, "0")}` };
            const [payrolls, total] = yield Promise.all([
                prisma_1.default.payroll.findMany({
                    where,
                    orderBy: [{ salaryMonth: "desc" }, { createdAt: "desc" }],
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma_1.default.payroll.count({ where }),
            ]);
            // Attach employee info
            const employeeIds = [...new Set(payrolls.map((p) => p.employeeId))];
            const users = yield prisma_1.default.user.findMany({
                where: { id: { in: employeeIds } },
                select: { id: true, name: true, role: true },
            });
            const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
            // Filter by role if requested
            let result = payrolls.map((p) => { var _a; return (Object.assign(Object.assign({}, p), { employee: (_a = userMap[p.employeeId]) !== null && _a !== void 0 ? _a : null })); });
            if (role)
                result = result.filter((p) => { var _a; return ((_a = p.employee) === null || _a === void 0 ? void 0 : _a.role) === role; });
            return res.json({ payrolls: result, total: role ? result.length : total });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function createPayroll(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { employeeId, salaryMonth, basicSalary, overtime = 0, ta = 0, bonus = 0, note } = req.body;
            if (!employeeId || !salaryMonth || !basicSalary)
                return res.status(400).json({ message: "employeeId, salaryMonth and basicSalary are required" });
            const totalPayable = parseFloat(basicSalary) + parseFloat(overtime) + parseFloat(ta) + parseFloat(bonus);
            const payroll = yield prisma_1.default.payroll.create({
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
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function updatePayroll(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { employeeId, salaryMonth, basicSalary, overtime = 0, ta = 0, bonus = 0, note } = req.body;
            if (!employeeId || !salaryMonth || !basicSalary)
                return res.status(400).json({ message: "employeeId, salaryMonth and basicSalary are required" });
            const totalPayable = parseFloat(basicSalary) + parseFloat(overtime) + parseFloat(ta) + parseFloat(bonus);
            const payroll = yield prisma_1.default.payroll.update({
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
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function markAsPaid(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const payroll = yield prisma_1.default.payroll.update({
                where: { id },
                data: { status: "Paid", paidAt: new Date() },
            });
            yield logFinancial(id, payroll.totalPayable, `Payroll #${id} — ${payroll.salaryMonth}`);
            return res.json({ payroll });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function trashPayroll(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.payroll.update({ where: { id }, data: { isTrashed: true } });
            return res.json({ message: "Moved to trash" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function restorePayroll(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.payroll.update({ where: { id }, data: { isTrashed: false } });
            return res.json({ message: "Restored" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function permanentDeletePayroll(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.payroll.delete({ where: { id } });
            return res.json({ message: "Permanently deleted" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
// ── Summary ──────────────────────────────────────────────────────────────────
function getPayrollSummary(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const month = req.query.month;
            const year = req.query.year;
            const where = { isTrashed: false, status: "Paid" };
            if (month && year)
                where.salaryMonth = `${year}-${month.padStart(2, "0")}`;
            else if (year)
                where.salaryMonth = { startsWith: year };
            const agg = yield prisma_1.default.payroll.aggregate({
                where,
                _sum: { basicSalary: true, overtime: true, ta: true, bonus: true, totalPayable: true },
                _count: { id: true },
            });
            // Unique employees
            const paid = yield prisma_1.default.payroll.findMany({ where, select: { employeeId: true } });
            const uniqueEmployees = new Set(paid.map((p) => p.employeeId)).size;
            return res.json({
                totalEmployees: uniqueEmployees,
                totalSalary: (_a = agg._sum.basicSalary) !== null && _a !== void 0 ? _a : 0,
                totalOvertime: (_b = agg._sum.overtime) !== null && _b !== void 0 ? _b : 0,
                totalTA: (_c = agg._sum.ta) !== null && _c !== void 0 ? _c : 0,
                totalBonus: (_d = agg._sum.bonus) !== null && _d !== void 0 ? _d : 0,
                totalPayroll: (_e = agg._sum.totalPayable) !== null && _e !== void 0 ? _e : 0,
                count: agg._count.id,
            });
        }
        catch (_f) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
