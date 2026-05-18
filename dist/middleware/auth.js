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
exports.verifyAdmin = exports.verifyUserInactive = exports.verifyUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
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
        const user = yield getUserFromToken(req);
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (!user.isActive)
            return res.status(401).json({ message: "Account inactive" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: "Token expired" });
    }
});
exports.verifyUser = verifyUser;
const verifyUserInactive = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUserFromToken(req);
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: "Token expired" });
    }
});
exports.verifyUserInactive = verifyUserInactive;
const verifyAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUserFromToken(req);
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ message: "Admin access required" });
        // @ts-ignore
        req.user = user;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: "Token expired" });
    }
});
exports.verifyAdmin = verifyAdmin;
