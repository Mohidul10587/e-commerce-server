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
exports.verifyAdminManagerSupportOrDesigner = exports.verifyAdminManagerSupportOrProduction = exports.verifyAdminManagerSupportDesignerOrProduction = exports.verifyAdminManagerOrSupport = exports.verifyAdminOrManager = exports.verifyAdmin = exports.verifyUserInactive = exports.verifyUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error("JWT_SECRET env variable is required");
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
};
/** Clears the token cookie and returns a standardised session-expired response. */
function sessionExpired(res) {
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        logout: true,
    });
}
function getUserFromToken(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = req.cookies.token;
        if (!token)
            return null;
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return prisma_1.default.user.findUnique({ where: { id: decoded.id } });
    });
}
const verifyUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        // Missing or empty token → session expired
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        if (user.isTrashed)
            return res.status(401).json({ message: "Account deactivated" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        // Covers: expired, invalid signature, malformed token
        return sessionExpired(res);
    }
});
exports.verifyUser = verifyUser;
const verifyUserInactive = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
});
exports.verifyUserInactive = verifyUserInactive;
const verifyAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        if (user.role !== "admin")
            return res.status(403).json({ message: "Admin access required" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
});
exports.verifyAdmin = verifyAdmin;
const verifyAdminOrManager = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        if (user.role !== "admin" && user.role !== "manager")
            return res.status(403).json({ message: "Access required" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
});
exports.verifyAdminOrManager = verifyAdminOrManager;
const verifyAdminManagerOrSupport = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        if (user.role !== "admin" && user.role !== "manager" && user.role !== "support")
            return res.status(403).json({ message: "Access required" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
});
exports.verifyAdminManagerOrSupport = verifyAdminManagerOrSupport;
/** Admin, Manager, Support, Designer, Production */
const verifyAdminManagerSupportDesignerOrProduction = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        const allowed = ["admin", "manager", "support", "designer", "production"];
        if (!allowed.includes(user.role))
            return res.status(403).json({ message: "Access required" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
});
exports.verifyAdminManagerSupportDesignerOrProduction = verifyAdminManagerSupportDesignerOrProduction;
/** Admin, Manager, Support, Production (for inventory) */
const verifyAdminManagerSupportOrProduction = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        const allowed = ["admin", "manager", "support", "production"];
        if (!allowed.includes(user.role))
            return res.status(403).json({ message: "Access required" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
});
exports.verifyAdminManagerSupportOrProduction = verifyAdminManagerSupportOrProduction;
/** Admin, Manager, Support, Designer (for assign designer) */
const verifyAdminManagerSupportOrDesigner = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const user = yield getUserFromToken(req);
        if (!user)
            return sessionExpired(res);
        const allowed = ["admin", "manager", "support", "designer"];
        if (!allowed.includes(user.role))
            return res.status(403).json({ message: "Access required" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
});
exports.verifyAdminManagerSupportOrDesigner = verifyAdminManagerSupportOrDesigner;
