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
exports.verifyAdminManagerSupportDesignerOrProduction = exports.verifyAdminManagerSupportOrProduction = exports.verifyAdminManagerSupportOrDesigner = exports.verifyAdminManagerOrSupport = exports.verifyAdminOrManager = exports.verifyAdmin = exports.verifyUserInactive = exports.verifyUser = exports.verifyActiveUser = exports.requireRoles = exports.authenticate = void 0;
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
function sessionExpired(res) {
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        logout: true,
    });
}
/**
 * Decodes the JWT and attaches { id, phone, role } to req.user.
 * No DB call. All role-based guards after this are free.
 */
const authenticate = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token)
            return sessionExpired(res);
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // @ts-ignore
        req.user = decoded;
        next();
    }
    catch (_a) {
        return sessionExpired(res);
    }
};
exports.authenticate = authenticate;
/**
 * Returns a middleware that allows only the specified roles.
 * Must be used after `authenticate`.
 *
 * Usage:
 *   router.get("/", authenticate, requireRoles("admin", "manager"), handler)
 *   router.use(authenticate);
 *   router.get("/x", requireRoles("admin"), handler)
 */
const requireRoles = (...roles) => (req, res, next) => {
    var _a;
    // @ts-ignore
    const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
    if (!roles.includes(role))
        return res.status(403).json({ message: "Access required" });
    next();
};
exports.requireRoles = requireRoles;
/**
 * Hits the DB once to confirm the user still exists and is not trashed.
 * Use only on routes where a deactivated-account check is truly needed
 * (e.g. login-like flows, sensitive mutations).
 * Must be used after `authenticate`.
 */
const verifyActiveUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-ignore
        const id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield prisma_1.default.user.findUnique({ where: { id } });
        if (!user)
            return sessionExpired(res);
        if (user.isTrashed)
            return res.status(401).json({ message: "Account deactivated" });
        // @ts-ignore
        req.user = user; // upgrade from JWT payload to full DB record
        next();
    }
    catch (_b) {
        return sessionExpired(res);
    }
});
exports.verifyActiveUser = verifyActiveUser;
// ─── Backwards-compatible named exports ──────────────────────────────────────
// Each export is: [authenticate, verifyActiveUser (DB, isTrashed check), requireRoles?]
// Single DB call per request, isTrashed always enforced on protected routes.
exports.verifyUser = [exports.authenticate, exports.verifyActiveUser];
exports.verifyUserInactive = [exports.authenticate]; // intentionally skips isTrashed check
exports.verifyAdmin = [exports.authenticate, exports.verifyActiveUser, (0, exports.requireRoles)("admin")];
exports.verifyAdminOrManager = [exports.authenticate, exports.verifyActiveUser, (0, exports.requireRoles)("admin", "manager")];
exports.verifyAdminManagerOrSupport = [exports.authenticate, exports.verifyActiveUser, (0, exports.requireRoles)("admin", "manager", "support")];
exports.verifyAdminManagerSupportOrDesigner = [exports.authenticate, exports.verifyActiveUser, (0, exports.requireRoles)("admin", "manager", "support", "designer")];
exports.verifyAdminManagerSupportOrProduction = [exports.authenticate, exports.verifyActiveUser, (0, exports.requireRoles)("admin", "manager", "support", "production")];
exports.verifyAdminManagerSupportDesignerOrProduction = [exports.authenticate, exports.verifyActiveUser, (0, exports.requireRoles)("admin", "manager", "support", "designer", "production")];
