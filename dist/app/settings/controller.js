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
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.addBanner = addBanner;
exports.deleteBanner = deleteBanner;
const prisma_1 = __importDefault(require("../../lib/prisma"));
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
        try {
            const s = yield getOrCreateSettings();
            const b = req.body;
            const data = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (b.siteTitle !== undefined && { siteTitle: b.siteTitle })), (b.siteDescription !== undefined && { siteDescription: b.siteDescription })), (b.logo !== undefined && { logo: b.logo })), (b.favicon !== undefined && { favicon: b.favicon })), (b.email !== undefined && { email: b.email })), (b.phone !== undefined && { phone: b.phone })), (b.address !== undefined && { address: b.address })), (b.supportEmail !== undefined && { supportEmail: b.supportEmail })), (b.facebook !== undefined && { facebook: b.facebook })), (b.instagram !== undefined && { instagram: b.instagram })), (b.twitter !== undefined && { twitter: b.twitter })), (b.linkedin !== undefined && { linkedin: b.linkedin })), (b.youtube !== undefined && { youtube: b.youtube })), (b.tiktok !== undefined && { tiktok: b.tiktok })), (b.whatsapp !== undefined && { whatsapp: b.whatsapp })), (b.telegram !== undefined && { telegram: b.telegram })), (b.metaTitle !== undefined && { metaTitle: b.metaTitle })), (b.metaDescription !== undefined && { metaDescription: b.metaDescription })), (b.metaKeywords !== undefined && { metaKeywords: b.metaKeywords })), (b.metaImage !== undefined && { metaImage: b.metaImage })), (b.footerText !== undefined && { footerText: b.footerText })), (b.deliveryFree !== undefined && { deliveryFree: b.deliveryFree })), (b.deliveryInsideDhaka !== undefined && { deliveryInsideDhaka: b.deliveryInsideDhaka })), (b.deliveryOutsideDhaka !== undefined && { deliveryOutsideDhaka: b.deliveryOutsideDhaka })), (b.fbPixelId !== undefined && { fbPixelId: b.fbPixelId || null })), (b.fbAccessToken !== undefined && { fbAccessToken: b.fbAccessToken || null })), (b.fbPixelEnabled !== undefined && { fbPixelEnabled: b.fbPixelEnabled })), (b.googlePixelId !== undefined && { googlePixelId: b.googlePixelId || null })), (b.googlePixelEnabled !== undefined && { googlePixelEnabled: b.googlePixelEnabled })), (b.whatsappApiUrl !== undefined && { whatsappApiUrl: b.whatsappApiUrl || null })), (b.whatsappApiToken !== undefined && { whatsappApiToken: b.whatsappApiToken || null })), (b.whatsappEnabled !== undefined && { whatsappEnabled: b.whatsappEnabled }));
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
        try {
            yield prisma_1.default.banner.delete({ where: { id: parseInt(req.params.id) } });
            return res.json({ message: "Deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
