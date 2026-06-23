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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.addBanner = addBanner;
exports.deleteBanner = deleteBanner;
exports.getFacebookSettings = getFacebookSettings;
exports.updateFacebookSettings = updateFacebookSettings;
exports.getGoogleSettings = getGoogleSettings;
exports.updateGoogleSettings = updateGoogleSettings;
exports.getWhatsAppSettings = getWhatsAppSettings;
exports.updateWhatsAppSettings = updateWhatsAppSettings;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const JWT_SECRET = process.env.JWT_SECRET;
function requireAdminOrManager(req, res) {
    try {
        const token = req.cookies.token;
        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return false;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== "admin" && decoded.role !== "manager") {
            res.status(403).json({ message: "Access required" });
            return false;
        }
        return true;
    }
    catch (_a) {
        res.status(401).json({ message: "Token expired" });
        return false;
    }
}
function requireAdmin(req, res) {
    try {
        const token = req.cookies.token;
        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return false;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== "admin") {
            res.status(403).json({ message: "Admin only" });
            return false;
        }
        return true;
    }
    catch (_a) {
        res.status(401).json({ message: "Token expired" });
        return false;
    }
}
function getOrCreateSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        let s = yield prisma_1.default.generalSettings.findFirst({ include: { banners: { orderBy: { order: "asc" } } } });
        if (!s)
            s = yield prisma_1.default.generalSettings.create({ data: {}, include: { banners: { orderBy: { order: "asc" } } } });
        return s;
    });
}
function getSettings(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return res.json({ settings: yield getOrCreateSettings() });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateSettings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdminOrManager(req, res))
            return;
        try {
            const s = yield getOrCreateSettings();
            const _a = req.body, { banners: _ } = _a, data = __rest(_a, ["banners"]); // banners managed separately
            const updated = yield prisma_1.default.generalSettings.update({
                where: { id: s.id }, data,
                include: { banners: { orderBy: { order: "asc" } } },
            });
            return res.json({ message: "Settings updated", settings: updated });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function addBanner(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const s = yield getOrCreateSettings();
            const { desktopImage, mobileImage, link } = req.body;
            if (!desktopImage || !mobileImage)
                return res.status(400).json({ message: "Both images required" });
            const count = yield prisma_1.default.banner.count({ where: { settingsId: s.id } });
            const banner = yield prisma_1.default.banner.create({ data: { desktopImage, mobileImage, link, order: count, settingsId: s.id } });
            return res.status(201).json({ banner });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function deleteBanner(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            yield prisma_1.default.banner.delete({ where: { id: parseInt(req.params.id) } });
            return res.json({ message: "Deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getFacebookSettings(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const s = yield getOrCreateSettings();
            return res.json({
                pixelId: s.fbPixelId || "",
                accessToken: s.fbAccessToken || "",
                enabled: s.fbPixelEnabled || false,
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateFacebookSettings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const s = yield getOrCreateSettings();
            const { pixelId, accessToken, enabled } = req.body;
            const updated = yield prisma_1.default.generalSettings.update({
                where: { id: s.id },
                data: {
                    fbPixelId: pixelId || null,
                    fbAccessToken: accessToken || null,
                    fbPixelEnabled: enabled || false,
                },
            });
            return res.json({ message: "Facebook settings updated", settings: {
                    pixelId: updated.fbPixelId || "",
                    accessToken: updated.fbAccessToken || "",
                    enabled: updated.fbPixelEnabled || false,
                } });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getGoogleSettings(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const s = yield getOrCreateSettings();
            return res.json({
                pixelId: s.googlePixelId || "",
                enabled: s.googlePixelEnabled || false,
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateGoogleSettings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const s = yield getOrCreateSettings();
            const { pixelId, enabled } = req.body;
            const updated = yield prisma_1.default.generalSettings.update({
                where: { id: s.id },
                data: {
                    googlePixelId: pixelId || null,
                    googlePixelEnabled: enabled || false,
                },
            });
            return res.json({ message: "Google settings updated", settings: {
                    pixelId: updated.googlePixelId || "",
                    enabled: updated.googlePixelEnabled || false,
                } });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getWhatsAppSettings(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const s = yield getOrCreateSettings();
            return res.json({
                apiUrl: s.whatsappApiUrl || "",
                apiToken: s.whatsappApiToken || "",
                enabled: s.whatsappEnabled || false,
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateWhatsAppSettings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!requireAdmin(req, res))
            return;
        try {
            const s = yield getOrCreateSettings();
            const { apiUrl, apiToken, enabled } = req.body;
            const updated = yield prisma_1.default.generalSettings.update({
                where: { id: s.id },
                data: {
                    whatsappApiUrl: apiUrl || null,
                    whatsappApiToken: apiToken || null,
                    whatsappEnabled: enabled || false,
                },
            });
            return res.json({ message: "WhatsApp settings updated", settings: {
                    apiUrl: updated.whatsappApiUrl || "",
                    apiToken: updated.whatsappApiToken || "",
                    enabled: updated.whatsappEnabled || false,
                } });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
