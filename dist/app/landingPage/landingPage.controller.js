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
exports.getLandingPages = getLandingPages;
exports.getTrashedLandingPages = getTrashedLandingPages;
exports.getLandingPageBySlug = getLandingPageBySlug;
exports.getLandingPageById = getLandingPageById;
exports.createLandingPage = createLandingPage;
exports.updateLandingPage = updateLandingPage;
exports.trashLandingPage = trashLandingPage;
exports.restoreLandingPage = restoreLandingPage;
exports.emptyTrash = emptyTrash;
exports.deleteLandingPage = deleteLandingPage;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const landingPage_validation_1 = require("./landingPage.validation");
const productInclude = {
    product: {
        include: {
            variants: {
                where: { isActive: true },
                orderBy: { isDefault: "desc" },
                select: {
                    id: true,
                    title: true,
                    size: true,
                    color: true,
                    regularPrice: true,
                    salePrice: true,
                    stock: true,
                    images: true,
                    isDefault: true,
                    isActive: true,
                },
            },
        },
    },
};
function getLandingPages(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pages = yield prisma_1.default.landingPage.findMany({
                where: { isTrashed: false },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    isActive: true,
                    isTrashed: true,
                    productId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            return res.json({ pages });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getTrashedLandingPages(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pages = yield prisma_1.default.landingPage.findMany({
                where: { isTrashed: true },
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    isActive: true,
                    isTrashed: true,
                    productId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            return res.json({ pages });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getLandingPageBySlug(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const page = yield prisma_1.default.landingPage.findUnique({
                where: { slug: req.params.slug },
                include: productInclude,
            });
            if (!page || !page.isActive || page.isTrashed)
                return res.status(404).json({ message: "Landing page not found" });
            const extraInkIds = (_a = page.extraInkProductIds) !== null && _a !== void 0 ? _a : [];
            const [freeGiftProduct, extraInkProducts] = yield Promise.all([
                prisma_1.default.product.findFirst({
                    where: { isFreeGift: true, isTrashed: false },
                    include: {
                        variants: {
                            where: { isActive: true },
                            orderBy: { isDefault: "desc" },
                            select: {
                                id: true,
                                title: true,
                                color: true,
                                size: true,
                                regularPrice: true,
                                salePrice: true,
                                stock: true,
                                images: true,
                                isDefault: true,
                                isActive: true,
                            },
                        },
                    },
                }),
                extraInkIds.length > 0
                    ? prisma_1.default.product.findMany({
                        where: { id: { in: extraInkIds }, isTrashed: false },
                        include: {
                            variants: {
                                where: { isActive: true },
                                orderBy: { isDefault: "desc" },
                                select: {
                                    id: true,
                                    title: true,
                                    color: true,
                                    size: true,
                                    regularPrice: true,
                                    salePrice: true,
                                    stock: true,
                                    images: true,
                                    isDefault: true,
                                    isActive: true,
                                },
                            },
                        },
                    })
                    : prisma_1.default.product.findMany({
                        where: { type: "ink", isTrashed: false },
                        include: {
                            variants: {
                                where: { isActive: true },
                                orderBy: { isDefault: "desc" },
                                select: {
                                    id: true,
                                    title: true,
                                    color: true,
                                    size: true,
                                    regularPrice: true,
                                    salePrice: true,
                                    stock: true,
                                    images: true,
                                    isDefault: true,
                                    isActive: true,
                                },
                            },
                        },
                    }),
            ]);
            return res.json({
                page: Object.assign(Object.assign({}, page), { freeGiftProduct: freeGiftProduct !== null && freeGiftProduct !== void 0 ? freeGiftProduct : null, extraInkProducts }),
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getLandingPageById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const page = yield prisma_1.default.landingPage.findUnique({
                where: { id },
                include: productInclude,
            });
            if (!page)
                return res.status(404).json({ message: "Landing page not found" });
            return res.json({ page });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function createLandingPage(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const parsed = landingPage_validation_1.createLandingPageSchema.safeParse(req.body);
            if (!parsed.success)
                return res
                    .status(400)
                    .json({ message: "Validation error", errors: parsed.error.flatten() });
            const _a = parsed.data, { productId, selectedVariantIds } = _a, pageData = __rest(_a, ["productId", "selectedVariantIds"]);
            const slugExists = yield prisma_1.default.landingPage.findUnique({
                where: { slug: pageData.slug },
            });
            if (slugExists)
                return res.status(409).json({ message: "Slug already exists" });
            const page = yield prisma_1.default.landingPage.create({
                data: Object.assign(Object.assign({}, pageData), { productId: productId !== null && productId !== void 0 ? productId : null, selectedVariantIds: selectedVariantIds !== null && selectedVariantIds !== void 0 ? selectedVariantIds : [] }),
                include: productInclude,
            });
            return res.status(201).json({ message: "Landing page created", page });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateLandingPage(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const parsed = landingPage_validation_1.updateLandingPageSchema.safeParse(req.body);
            if (!parsed.success)
                return res
                    .status(400)
                    .json({ message: "Validation error", errors: parsed.error.flatten() });
            const _a = parsed.data, { productId, selectedVariantIds } = _a, pageData = __rest(_a, ["productId", "selectedVariantIds"]);
            const slugExists = yield prisma_1.default.landingPage.findFirst({
                where: { slug: pageData.slug, NOT: { id } },
            });
            if (slugExists)
                return res.status(409).json({ message: "Slug already exists" });
            const page = yield prisma_1.default.landingPage.update({
                where: { id },
                data: Object.assign(Object.assign({}, pageData), { productId: productId !== null && productId !== void 0 ? productId : null, selectedVariantIds: selectedVariantIds !== null && selectedVariantIds !== void 0 ? selectedVariantIds : [] }),
                include: productInclude,
            });
            return res.json({ message: "Landing page updated", page });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function trashLandingPage(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const page = yield prisma_1.default.landingPage.findUnique({ where: { id } });
            if (!page)
                return res.status(404).json({ message: "Landing page not found" });
            yield prisma_1.default.landingPage.update({
                where: { id },
                data: { isTrashed: true, isActive: false },
            });
            return res.json({ message: "Landing page moved to trash" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function restoreLandingPage(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const page = yield prisma_1.default.landingPage.findUnique({ where: { id } });
            if (!page)
                return res.status(404).json({ message: "Landing page not found" });
            yield prisma_1.default.landingPage.update({
                where: { id },
                data: { isTrashed: false },
            });
            return res.json({ message: "Landing page restored" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function emptyTrash(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { count } = yield prisma_1.default.landingPage.deleteMany({
                where: { isTrashed: true },
            });
            return res.json({
                message: `${count} landing page(s) permanently deleted`,
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function deleteLandingPage(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const page = yield prisma_1.default.landingPage.findUnique({ where: { id } });
            if (!page)
                return res.status(404).json({ message: "Landing page not found" });
            if (!page.isTrashed)
                return res
                    .status(400)
                    .json({ message: "Move to trash first before permanent delete" });
            yield prisma_1.default.landingPage.delete({ where: { id } });
            return res.json({ message: "Landing page permanently deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
