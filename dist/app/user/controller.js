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
exports.login = login;
exports.signup = signup;
exports.me = me;
exports.refresh = refresh;
exports.logout = logout;
exports.getUsers = getUsers;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.moveUserToTrash = moveUserToTrash;
exports.restoreUser = restoreUser;
exports.permanentDeleteUser = permanentDeleteUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? "none" : "lax"),
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
function signToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function safeUser(user) {
    return { id: user.id, name: user.name, phone: user.phone, role: user.role, isTrashed: user.isTrashed, image: user.image };
}
function requireAdmin(req, res) {
    try {
        const token = req.cookies.token;
        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== "admin" && decoded.role !== "manager") {
            res.status(403).json({ message: "Admin only" });
            return null;
        }
        return decoded;
    }
    catch (_a) {
        res.status(401).json({ message: "Token expired" });
        return null;
    }
}
function login(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { phone, password } = req.body;
            if (!phone || !password)
                return res.status(400).json({ message: "Phone and password required" });
            const user = yield prisma_1.default.user.findUnique({ where: { phone } });
            if (!user)
                return res.status(404).json({ message: "User not found" });
            if (user.isTrashed)
                return res.status(403).json({ message: "Account is deactivated" });
            const isMatch = yield bcrypt_1.default.compare(password, user.password);
            if (!isMatch)
                return res.status(401).json({ message: "Invalid credentials" });
            res.cookie("token", signToken(user), COOKIE_OPTIONS);
            return res.json({ message: "Login successful", user: safeUser(user) });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function signup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { name, phone, password } = req.body;
            if (!name || !phone || !password)
                return res.status(400).json({ message: "Name, phone and password required" });
            const existing = yield prisma_1.default.user.findUnique({ where: { phone } });
            if (existing)
                return res.status(409).json({ message: "Phone already registered" });
            const hashed = yield bcrypt_1.default.hash(password, 10);
            const user = yield prisma_1.default.user.create({ data: { name, phone, password: hashed } });
            res.cookie("token", signToken(user), COOKIE_OPTIONS);
            return res.status(201).json({ message: "Registration successful", user: safeUser(user) });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function me(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = req.cookies.token;
            if (!token)
                return res.status(401).json({ message: "Unauthorized" });
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = yield prisma_1.default.user.findUnique({ where: { id: decoded.id } });
            if (!user)
                return res.status(404).json({ message: "User not found" });
            return res.json({ user: safeUser(user) });
        }
        catch (_a) {
            return res.status(401).json({ message: "Token expired" });
        }
    });
}
function refresh(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = req.cookies.token;
            if (!token)
                return res.status(401).json({ message: "Unauthorized" });
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = yield prisma_1.default.user.findUnique({ where: { id: decoded.id } });
            if (!user)
                return res.status(404).json({ message: "User not found" });
            res.cookie("token", signToken(user), COOKIE_OPTIONS);
            return res.json({ user: safeUser(user) });
        }
        catch (_a) {
            return res.status(401).json({ message: "Token expired" });
        }
    });
}
function logout(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        res.clearCookie("token", COOKIE_OPTIONS);
        return res.json({ message: "Logged out" });
    });
}
// ── Admin: User CRUD ──────────────────────────────────────────────
function getUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const { trash, search, page = "1", limit = "20" } = req.query;
            const where = { isTrashed: trash === "true" };
            if (search) {
                const s = search;
                where.OR = [
                    { name: { contains: s, mode: "insensitive" } },
                    { phone: { contains: s, mode: "insensitive" } },
                ];
            }
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);
            const [users, total] = yield Promise.all([
                prisma_1.default.user.findMany({
                    where,
                    select: { id: true, name: true, phone: true, role: true, isTrashed: true, image: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                }),
                prisma_1.default.user.count({ where }),
            ]);
            return res.json({ users, total, page: parseInt(page), limit: take });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function createUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const { name, phone, password, role } = req.body;
            if (!name || !phone || !password)
                return res.status(400).json({ message: "Name, phone and password required" });
            const existing = yield prisma_1.default.user.findUnique({ where: { phone } });
            if (existing)
                return res.status(409).json({ message: "Phone already registered" });
            const hashed = yield bcrypt_1.default.hash(password, 10);
            const user = yield prisma_1.default.user.create({ data: { name, phone, password: hashed, role: role || "customer" } });
            return res.status(201).json({ message: "User created", user: safeUser(user) });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const id = parseInt(req.params.id);
            const { name, phone, role, password } = req.body;
            const data = {};
            if (name)
                data.name = name;
            if (phone)
                data.phone = phone;
            if (role)
                data.role = role;
            if (password)
                data.password = yield bcrypt_1.default.hash(password, 10);
            const user = yield prisma_1.default.user.update({ where: { id }, data });
            return res.json({ message: "User updated", user: safeUser(user) });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function moveUserToTrash(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.user.update({ where: { id }, data: { isTrashed: true } });
            return res.json({ message: "User moved to trash" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function restoreUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.user.update({ where: { id }, data: { isTrashed: false } });
            return res.json({ message: "User restored" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function permanentDeleteUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.user.delete({ where: { id } });
            return res.json({ message: "User permanently deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
