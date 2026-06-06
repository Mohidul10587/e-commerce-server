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
exports.getSuppliers = getSuppliers;
exports.createSupplier = createSupplier;
exports.updateSupplier = updateSupplier;
exports.trashSupplier = trashSupplier;
exports.restoreSupplier = restoreSupplier;
exports.deleteSupplier = deleteSupplier;
const prisma_1 = __importDefault(require("../../lib/prisma"));
function getSuppliers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || "";
            const trash = req.query.trash === "true";
            const where = Object.assign({ isTrashed: trash }, (search && {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                ],
            }));
            const [suppliers, total] = yield Promise.all([
                prisma_1.default.supplier.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma_1.default.supplier.count({ where }),
            ]);
            return res.json({ suppliers, total });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function createSupplier(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { name, address, phone, website, facebook } = req.body;
            if (!name)
                return res.status(400).json({ message: "Name is required" });
            const supplier = yield prisma_1.default.supplier.create({
                data: { name, address, phone, website, facebook },
            });
            return res.status(201).json({ supplier });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateSupplier(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const { name, address, phone, website, facebook } = req.body;
            if (!name)
                return res.status(400).json({ message: "Name is required" });
            const supplier = yield prisma_1.default.supplier.update({
                where: { id },
                data: { name, address, phone, website, facebook },
            });
            return res.json({ supplier });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function trashSupplier(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma_1.default.supplier.update({
                where: { id: parseInt(req.params.id) },
                data: { isTrashed: true },
            });
            return res.json({ message: "Moved to trash" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function restoreSupplier(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma_1.default.supplier.update({
                where: { id: parseInt(req.params.id) },
                data: { isTrashed: false },
            });
            return res.json({ message: "Restored" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function deleteSupplier(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma_1.default.supplier.delete({ where: { id: parseInt(req.params.id) } });
            return res.json({ message: "Deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
