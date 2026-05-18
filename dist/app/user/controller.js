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
exports.deleteUser = deleteUser;
exports.toggleActive = toggleActive;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
function signToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function safeUser(user) {
    return { id: user.id, name: user.name, phone: user.phone, role: user.role, isActive: user.isActive, image: user.image };
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
        res.clearCookie("token");
        return res.json({ message: "Logged out" });
    });
}
// ── Admin: User CRUD ──────────────────────────────────────────────
function requireAdmin(req, res) {
    try {
        const token = req.cookies.token;
        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== "admin") {
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
function getUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const users = yield prisma_1.default.user.findMany({
                select: { id: true, name: true, phone: true, role: true, isActive: true, image: true, createdAt: true },
                orderBy: { createdAt: "desc" },
            });
            return res.json({ users });
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
            const user = yield prisma_1.default.user.create({
                data: { name, phone, password: hashed, role: role || "designer" },
            });
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
            const { name, phone, role, isActive, password } = req.body;
            const data = {};
            if (name)
                data.name = name;
            if (phone)
                data.phone = phone;
            if (role)
                data.role = role;
            if (typeof isActive === "boolean")
                data.isActive = isActive;
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
function deleteUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.user.delete({ where: { id } });
            return res.json({ message: "User deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function toggleActive(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const id = parseInt(req.params.id);
            const user = yield prisma_1.default.user.findUnique({ where: { id } });
            if (!user)
                return res.status(404).json({ message: "User not found" });
            const updated = yield prisma_1.default.user.update({ where: { id }, data: { isActive: !user.isActive } });
            return res.json({ message: "Updated", user: safeUser(updated) });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
