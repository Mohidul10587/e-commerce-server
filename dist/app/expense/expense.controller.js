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
exports.getExpenseSummary = getExpenseSummary;
exports.getFinancialActivityLog = getFinancialActivityLog;
exports.listOfficeExpenseCategories = listOfficeExpenseCategories;
exports.createOfficeExpenseCategory = createOfficeExpenseCategory;
exports.updateOfficeExpenseCategory = updateOfficeExpenseCategory;
exports.trashOfficeExpenseCategory = trashOfficeExpenseCategory;
exports.restoreOfficeExpenseCategory = restoreOfficeExpenseCategory;
exports.permanentDeleteOfficeExpenseCategory = permanentDeleteOfficeExpenseCategory;
exports.listMarketingExpenseCategories = listMarketingExpenseCategories;
exports.createMarketingExpenseCategory = createMarketingExpenseCategory;
exports.updateMarketingExpenseCategory = updateMarketingExpenseCategory;
exports.trashMarketingExpenseCategory = trashMarketingExpenseCategory;
exports.restoreMarketingExpenseCategory = restoreMarketingExpenseCategory;
exports.permanentDeleteMarketingExpenseCategory = permanentDeleteMarketingExpenseCategory;
exports.listOfficeExpenses = listOfficeExpenses;
exports.createOfficeExpense = createOfficeExpense;
exports.updateOfficeExpense = updateOfficeExpense;
exports.trashOfficeExpense = trashOfficeExpense;
exports.restoreOfficeExpense = restoreOfficeExpense;
exports.permanentDeleteOfficeExpense = permanentDeleteOfficeExpense;
exports.listMarketingExpenses = listMarketingExpenses;
exports.createMarketingExpense = createMarketingExpense;
exports.updateMarketingExpense = updateMarketingExpense;
exports.trashMarketingExpense = trashMarketingExpense;
exports.restoreMarketingExpense = restoreMarketingExpense;
exports.permanentDeleteMarketingExpense = permanentDeleteMarketingExpense;
const prisma_1 = __importDefault(require("../../lib/prisma"));
function logActivity(action, entity, entityId, note, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma_1.default.financialActivityLog.create({ data: { action, entity, entityId, note, amount } });
    });
}
function buildDateRange(type) {
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
function getExpenseSummary(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            const todayRange = buildDateRange("today");
            const monthRange = buildDateRange("month");
            const [totalOffice, todayOffice, monthOffice, totalMarketing, todayMarketing, monthMarketing] = yield Promise.all([
                prisma_1.default.officeExpense.aggregate({ where: { isTrashed: false }, _sum: { amount: true } }),
                prisma_1.default.officeExpense.aggregate({ where: { isTrashed: false, createdAt: todayRange }, _sum: { amount: true } }),
                prisma_1.default.officeExpense.aggregate({ where: { isTrashed: false, createdAt: monthRange }, _sum: { amount: true } }),
                prisma_1.default.marketingExpense.aggregate({ where: { isTrashed: false }, _sum: { amount: true } }),
                prisma_1.default.marketingExpense.aggregate({ where: { isTrashed: false, createdAt: todayRange }, _sum: { amount: true } }),
                prisma_1.default.marketingExpense.aggregate({ where: { isTrashed: false, createdAt: monthRange }, _sum: { amount: true } }),
            ]);
            const to = (_a = totalOffice._sum.amount) !== null && _a !== void 0 ? _a : 0;
            const dyo = (_b = todayOffice._sum.amount) !== null && _b !== void 0 ? _b : 0;
            const mto = (_c = monthOffice._sum.amount) !== null && _c !== void 0 ? _c : 0;
            const tm = (_d = totalMarketing._sum.amount) !== null && _d !== void 0 ? _d : 0;
            const dym = (_e = todayMarketing._sum.amount) !== null && _e !== void 0 ? _e : 0;
            const mtm = (_f = monthMarketing._sum.amount) !== null && _f !== void 0 ? _f : 0;
            return res.json({
                office: { total: to, thisMonth: mto, today: dyo },
                marketing: { total: tm, thisMonth: mtm, today: dym },
                combined: { total: to + tm, thisMonth: mto + mtm, today: dyo + dym },
            });
        }
        catch (_g) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
// ── Financial Activity Log ───────────────────────────────────────────────────
function getFinancialActivityLog(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const entity = req.query.entity;
            const where = {};
            if (entity)
                where.entity = entity;
            if (search)
                where.OR = [
                    { note: { contains: search, mode: "insensitive" } },
                    { action: { contains: search, mode: "insensitive" } },
                    { entity: { contains: search, mode: "insensitive" } },
                ];
            const [logs, total] = yield Promise.all([
                prisma_1.default.financialActivityLog.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma_1.default.financialActivityLog.count({ where }),
            ]);
            return res.json({ logs, total });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
// ── Office Expense Categories ────────────────────────────────────────────────
function listOfficeExpenseCategories(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const trash = req.query.trash === "true";
            const where = { isTrashed: trash };
            if (search)
                where.name = { contains: search, mode: "insensitive" };
            const [items, total] = yield Promise.all([
                prisma_1.default.officeExpenseCategory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
                prisma_1.default.officeExpenseCategory.count({ where }),
            ]);
            return res.json({ items, total });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function createOfficeExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { name, status } = req.body;
            if (!(name === null || name === void 0 ? void 0 : name.trim()))
                return res.status(400).json({ message: "Name is required" });
            const item = yield prisma_1.default.officeExpenseCategory.create({ data: { name: name.trim(), status: status || "active" } });
            yield logActivity("CREATE", "OfficeExpenseCategory", item.id, name.trim());
            return res.status(201).json({ item });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function updateOfficeExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { name, status } = req.body;
            if (!(name === null || name === void 0 ? void 0 : name.trim()))
                return res.status(400).json({ message: "Name is required" });
            const item = yield prisma_1.default.officeExpenseCategory.update({ where: { id }, data: { name: name.trim(), status } });
            yield logActivity("UPDATE", "OfficeExpenseCategory", id, name.trim());
            return res.json({ item });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function trashOfficeExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.officeExpenseCategory.update({ where: { id }, data: { isTrashed: true } });
            yield logActivity("TRASH", "OfficeExpenseCategory", id);
            return res.json({ message: "Moved to trash" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function restoreOfficeExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.officeExpenseCategory.update({ where: { id }, data: { isTrashed: false } });
            yield logActivity("RESTORE", "OfficeExpenseCategory", id);
            return res.json({ message: "Restored" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function permanentDeleteOfficeExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.officeExpenseCategory.delete({ where: { id } });
            yield logActivity("PERMANENT_DELETE", "OfficeExpenseCategory", id);
            return res.json({ message: "Permanently deleted" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
// ── Marketing Expense Categories ─────────────────────────────────────────────
function listMarketingExpenseCategories(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const trash = req.query.trash === "true";
            const where = { isTrashed: trash };
            if (search)
                where.name = { contains: search, mode: "insensitive" };
            const [items, total] = yield Promise.all([
                prisma_1.default.marketingExpenseCategory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
                prisma_1.default.marketingExpenseCategory.count({ where }),
            ]);
            return res.json({ items, total });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function createMarketingExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { name, status } = req.body;
            if (!(name === null || name === void 0 ? void 0 : name.trim()))
                return res.status(400).json({ message: "Name is required" });
            const item = yield prisma_1.default.marketingExpenseCategory.create({ data: { name: name.trim(), status: status || "active" } });
            yield logActivity("CREATE", "MarketingExpenseCategory", item.id, name.trim());
            return res.status(201).json({ item });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function updateMarketingExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { name, status } = req.body;
            if (!(name === null || name === void 0 ? void 0 : name.trim()))
                return res.status(400).json({ message: "Name is required" });
            const item = yield prisma_1.default.marketingExpenseCategory.update({ where: { id }, data: { name: name.trim(), status } });
            yield logActivity("UPDATE", "MarketingExpenseCategory", id, name.trim());
            return res.json({ item });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function trashMarketingExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.marketingExpenseCategory.update({ where: { id }, data: { isTrashed: true } });
            yield logActivity("TRASH", "MarketingExpenseCategory", id);
            return res.json({ message: "Moved to trash" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function restoreMarketingExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.marketingExpenseCategory.update({ where: { id }, data: { isTrashed: false } });
            yield logActivity("RESTORE", "MarketingExpenseCategory", id);
            return res.json({ message: "Restored" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function permanentDeleteMarketingExpenseCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.marketingExpenseCategory.delete({ where: { id } });
            yield logActivity("PERMANENT_DELETE", "MarketingExpenseCategory", id);
            return res.json({ message: "Permanently deleted" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
// ── Office Expenses ──────────────────────────────────────────────────────────
function listOfficeExpenses(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const trash = req.query.trash === "true";
            const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : undefined;
            const dateFrom = req.query.dateFrom;
            const dateTo = req.query.dateTo;
            const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin) : undefined;
            const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax) : undefined;
            const where = { isTrashed: trash };
            if (categoryId)
                where.categoryId = categoryId;
            if (amountMin !== undefined || amountMax !== undefined) {
                where.amount = {};
                if (amountMin !== undefined)
                    where.amount.gte = amountMin;
                if (amountMax !== undefined)
                    where.amount.lte = amountMax;
            }
            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom)
                    where.createdAt.gte = new Date(dateFrom);
                if (dateTo)
                    where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
            }
            if (search)
                where.OR = [
                    { note: { contains: search, mode: "insensitive" } },
                    { category: { name: { contains: search, mode: "insensitive" } } },
                ];
            const [expenses, total] = yield Promise.all([
                prisma_1.default.officeExpense.findMany({
                    where,
                    include: { category: { select: { id: true, name: true } } },
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma_1.default.officeExpense.count({ where }),
            ]);
            return res.json({ expenses, total });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function createOfficeExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { categoryId, note, amount } = req.body;
            if (!categoryId)
                return res.status(400).json({ message: "Category is required" });
            if (!(note === null || note === void 0 ? void 0 : note.trim()))
                return res.status(400).json({ message: "Note is required" });
            if (!amount || amount <= 0)
                return res.status(400).json({ message: "Amount must be greater than 0" });
            const expense = yield prisma_1.default.officeExpense.create({
                data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
                include: { category: { select: { id: true, name: true } } },
            });
            yield logActivity("CREATE", "OfficeExpense", expense.id, note.trim(), parseFloat(amount));
            return res.status(201).json({ expense });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function updateOfficeExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { categoryId, note, amount } = req.body;
            if (!categoryId)
                return res.status(400).json({ message: "Category is required" });
            if (!(note === null || note === void 0 ? void 0 : note.trim()))
                return res.status(400).json({ message: "Note is required" });
            if (!amount || amount <= 0)
                return res.status(400).json({ message: "Amount must be greater than 0" });
            const expense = yield prisma_1.default.officeExpense.update({
                where: { id },
                data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
                include: { category: { select: { id: true, name: true } } },
            });
            yield logActivity("UPDATE", "OfficeExpense", id, note.trim(), parseFloat(amount));
            return res.json({ expense });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function trashOfficeExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.officeExpense.update({ where: { id }, data: { isTrashed: true } });
            yield logActivity("TRASH", "OfficeExpense", id);
            return res.json({ message: "Moved to trash" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function restoreOfficeExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.officeExpense.update({ where: { id }, data: { isTrashed: false } });
            yield logActivity("RESTORE", "OfficeExpense", id);
            return res.json({ message: "Restored" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function permanentDeleteOfficeExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.officeExpense.delete({ where: { id } });
            yield logActivity("PERMANENT_DELETE", "OfficeExpense", id);
            return res.json({ message: "Permanently deleted" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
// ── Marketing Expenses ───────────────────────────────────────────────────────
function listMarketingExpenses(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const trash = req.query.trash === "true";
            const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : undefined;
            const dateFrom = req.query.dateFrom;
            const dateTo = req.query.dateTo;
            const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin) : undefined;
            const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax) : undefined;
            const where = { isTrashed: trash };
            if (categoryId)
                where.categoryId = categoryId;
            if (amountMin !== undefined || amountMax !== undefined) {
                where.amount = {};
                if (amountMin !== undefined)
                    where.amount.gte = amountMin;
                if (amountMax !== undefined)
                    where.amount.lte = amountMax;
            }
            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom)
                    where.createdAt.gte = new Date(dateFrom);
                if (dateTo)
                    where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
            }
            if (search)
                where.OR = [
                    { note: { contains: search, mode: "insensitive" } },
                    { category: { name: { contains: search, mode: "insensitive" } } },
                ];
            const [expenses, total] = yield Promise.all([
                prisma_1.default.marketingExpense.findMany({
                    where,
                    include: { category: { select: { id: true, name: true } } },
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma_1.default.marketingExpense.count({ where }),
            ]);
            return res.json({ expenses, total });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function createMarketingExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { categoryId, note, amount } = req.body;
            if (!categoryId)
                return res.status(400).json({ message: "Category is required" });
            if (!(note === null || note === void 0 ? void 0 : note.trim()))
                return res.status(400).json({ message: "Note is required" });
            if (!amount || amount <= 0)
                return res.status(400).json({ message: "Amount must be greater than 0" });
            const expense = yield prisma_1.default.marketingExpense.create({
                data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
                include: { category: { select: { id: true, name: true } } },
            });
            yield logActivity("CREATE", "MarketingExpense", expense.id, note.trim(), parseFloat(amount));
            return res.status(201).json({ expense });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function updateMarketingExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { categoryId, note, amount } = req.body;
            if (!categoryId)
                return res.status(400).json({ message: "Category is required" });
            if (!(note === null || note === void 0 ? void 0 : note.trim()))
                return res.status(400).json({ message: "Note is required" });
            if (!amount || amount <= 0)
                return res.status(400).json({ message: "Amount must be greater than 0" });
            const expense = yield prisma_1.default.marketingExpense.update({
                where: { id },
                data: { categoryId: parseInt(categoryId), note: note.trim(), amount: parseFloat(amount) },
                include: { category: { select: { id: true, name: true } } },
            });
            yield logActivity("UPDATE", "MarketingExpense", id, note.trim(), parseFloat(amount));
            return res.json({ expense });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function trashMarketingExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.marketingExpense.update({ where: { id }, data: { isTrashed: true } });
            yield logActivity("TRASH", "MarketingExpense", id);
            return res.json({ message: "Moved to trash" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function restoreMarketingExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.marketingExpense.update({ where: { id }, data: { isTrashed: false } });
            yield logActivity("RESTORE", "MarketingExpense", id);
            return res.json({ message: "Restored" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
function permanentDeleteMarketingExpense(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.marketingExpense.delete({ where: { id } });
            yield logActivity("PERMANENT_DELETE", "MarketingExpense", id);
            return res.json({ message: "Permanently deleted" });
        }
        catch (_a) {
            return res.status(500).json({ message: "Server error" });
        }
    });
}
