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
exports.getProducts = getProducts;
exports.getInkProducts = getInkProducts;
exports.getFreeGiftProduct = getFreeGiftProduct;
exports.getProductBySlug = getProductBySlug;
exports.getProductById = getProductById;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.copyProduct = copyProduct;
exports.moveToTrash = moveToTrash;
exports.restoreFromTrash = restoreFromTrash;
exports.permanentDeleteProduct = permanentDeleteProduct;
exports.emptyProductTrash = emptyProductTrash;
exports.updateVariantStock = updateVariantStock;
exports.getStockHistory = getStockHistory;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const product_validation_1 = require("./product.validation");
const product_service_1 = require("./product.service");
const productInclude = {
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
            purchasePrice: true,
            stock: true,
            sku: true,
            images: true,
            isDefault: true,
            isActive: true,
        },
    },
};
function getProducts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { type, page = "1", limit = "20", trash, search, showOnLanding } = req.query;
            const where = { isTrashed: trash === "true" };
            if (type)
                where.type = type;
            if (showOnLanding === "true")
                where.showOnLanding = true;
            if (search) {
                const s = search;
                where.OR = [
                    { title: { contains: s, mode: "insensitive" } },
                    { slug: { contains: s, mode: "insensitive" } },
                    { variants: { some: { sku: { contains: s, mode: "insensitive" } } } },
                ];
            }
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);
            const [products, total] = yield Promise.all([
                prisma_1.default.product.findMany({
                    where,
                    include: productInclude,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                }),
                prisma_1.default.product.count({ where }),
            ]);
            return res.json({
                products,
                total,
                page: parseInt(page),
                limit: take,
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getInkProducts(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const products = yield prisma_1.default.product.findMany({
                where: { type: "ink", isTrashed: false },
                include: productInclude,
                orderBy: { createdAt: "desc" },
            });
            return res.json({ products });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getFreeGiftProduct(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const product = yield prisma_1.default.product.findFirst({
                where: { isFreeGift: true, isTrashed: false },
                include: productInclude,
            });
            return res.json({ product: product !== null && product !== void 0 ? product : null });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getProductBySlug(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const product = yield prisma_1.default.product.findUnique({
                where: { slug: req.params.slug },
                include: productInclude,
            });
            if (!product || product.isTrashed)
                return res.status(404).json({ message: "Product not found" });
            // Include free gift product if this is a seal product
            let freeGiftProduct = null;
            if (product.type === "seal") {
                freeGiftProduct = yield prisma_1.default.product.findFirst({
                    where: { isFreeGift: true, isTrashed: false },
                    include: productInclude,
                });
            }
            return res.json({ product, freeGiftProduct });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getProductById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const product = yield prisma_1.default.product.findUnique({
                where: { id },
                include: { variants: { orderBy: { isDefault: "desc" } } },
            });
            if (!product)
                return res.status(404).json({ message: "Product not found" });
            return res.json({ product });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function createProduct(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const parsed = product_validation_1.createProductSchema.safeParse(req.body);
            if (!parsed.success)
                return res
                    .status(400)
                    .json({ message: "Validation error", errors: parsed.error.flatten() });
            const _a = parsed.data, { variants } = _a, productData = __rest(_a, ["variants"]);
            const slugExists = yield prisma_1.default.product.findUnique({
                where: { slug: productData.slug },
            });
            if (slugExists)
                return res.status(409).json({ message: "Slug already exists" });
            const skus = variants.map((v) => v.sku);
            const duplicateSku = yield prisma_1.default.productVariant.findFirst({
                where: { sku: { in: skus } },
            });
            if (duplicateSku)
                return res
                    .status(409)
                    .json({ message: `SKU already exists: ${duplicateSku.sku}` });
            const product = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                // Enforce single free gift product
                if (productData.isFreeGift) {
                    const existing = yield tx.product.findFirst({
                        where: { isFreeGift: true, isTrashed: false },
                    });
                    if (existing)
                        throw Object.assign(new Error(`"${existing.title}" is already marked as the free gift. Remove that tag first.`), { status: 409 });
                }
                const created = yield tx.product.create({
                    data: Object.assign(Object.assign({}, productData), { keywords: (_a = productData.keywords) !== null && _a !== void 0 ? _a : [], isFreeGift: (_b = productData.isFreeGift) !== null && _b !== void 0 ? _b : false, showOnLanding: (_c = productData.showOnLanding) !== null && _c !== void 0 ? _c : false, totalStock: 0, variants: { create: variants.map((_a) => {
                                var { id: _id } = _a, v = __rest(_a, ["id"]);
                                return v;
                            }) } }),
                    include: productInclude,
                });
                for (const variant of created.variants) {
                    if (variant.stock > 0) {
                        yield tx.stockHistory.create({
                            data: {
                                variantId: variant.id,
                                action: "ADD",
                                quantity: variant.stock,
                                note: "Initial stock",
                            },
                        });
                    }
                }
                yield (0, product_service_1.syncProductStock)(created.id, tx);
                return tx.product.findUniqueOrThrow({
                    where: { id: created.id },
                    include: productInclude,
                });
            }));
            return res.status(201).json({ message: "Product created", product });
        }
        catch (error) {
            if (error.status)
                return res.status(error.status).json({ message: error.message });
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateProduct(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const parsed = product_validation_1.updateProductSchema.safeParse(req.body);
            if (!parsed.success)
                return res
                    .status(400)
                    .json({ message: "Validation error", errors: parsed.error.flatten() });
            const _a = parsed.data, { variants } = _a, productData = __rest(_a, ["variants"]);
            if (productData.slug) {
                const slugExists = yield prisma_1.default.product.findFirst({
                    where: { slug: productData.slug, NOT: { id } },
                });
                if (slugExists)
                    return res.status(409).json({ message: "Slug already exists" });
            }
            const newVariantSkus = variants.filter((v) => !v.id).map((v) => v.sku);
            if (newVariantSkus.length > 0) {
                const duplicateSku = yield prisma_1.default.productVariant.findFirst({
                    where: { sku: { in: newVariantSkus } },
                });
                if (duplicateSku)
                    return res
                        .status(409)
                        .json({ message: `SKU already exists: ${duplicateSku.sku}` });
            }
            const product = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // Enforce single free gift product (exclude self when editing)
                if (productData.isFreeGift) {
                    const existing = yield tx.product.findFirst({
                        where: { isFreeGift: true, isTrashed: false, NOT: { id } },
                    });
                    if (existing)
                        throw Object.assign(new Error(`"${existing.title}" is already marked as the free gift. Remove that tag first.`), { status: 409 });
                }
                yield tx.product.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, productData), { keywords: (_a = productData.keywords) !== null && _a !== void 0 ? _a : [] }),
                });
                yield (0, product_service_1.syncVariants)(id, variants, tx);
                yield (0, product_service_1.syncProductStock)(id, tx);
                return tx.product.findUniqueOrThrow({
                    where: { id },
                    include: productInclude,
                });
            }));
            return res.json({ message: "Product updated", product });
        }
        catch (error) {
            if (error.status)
                return res.status(error.status).json({ message: error.message });
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function copyProduct(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            const source = yield prisma_1.default.product.findUnique({
                where: { id },
                include: { variants: { orderBy: { isDefault: "desc" } } },
            });
            if (!source)
                return res.status(404).json({ message: "Product not found" });
            const suffix = `-copy-${Date.now()}`;
            const newSlug = source.slug + suffix;
            const product = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const created = yield tx.product.create({
                    data: {
                        title: source.title + " (Copy)",
                        slug: newSlug,
                        description: source.description,
                        seoTitle: source.seoTitle,
                        seoDescription: source.seoDescription,
                        keywords: source.keywords,
                        type: source.type,
                        isFreeGift: false,
                        totalStock: 0,
                        variants: {
                            create: source.variants.map((v) => ({
                                title: v.title,
                                size: v.size,
                                color: v.color,
                                regularPrice: v.regularPrice,
                                salePrice: v.salePrice,
                                purchasePrice: v.purchasePrice,
                                stock: 0,
                                sku: v.sku + suffix,
                                images: v.images,
                                isDefault: v.isDefault,
                                isActive: v.isActive,
                            })),
                        },
                    },
                    include: productInclude,
                });
                return created;
            }));
            return res.status(201).json({ message: "Product copied", product });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function moveToTrash(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.product.update({ where: { id }, data: { isTrashed: true } });
            return res.json({ message: "Product moved to trash" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function restoreFromTrash(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.product.update({ where: { id }, data: { isTrashed: false } });
            return res.json({ message: "Product restored" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function permanentDeleteProduct(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id);
            yield prisma_1.default.product.delete({ where: { id } });
            return res.json({ message: "Product permanently deleted" });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function emptyProductTrash(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { count } = yield prisma_1.default.product.deleteMany({
                where: { isTrashed: true },
            });
            return res.json({ message: `${count} products permanently deleted` });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function updateVariantStock(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const variantId = parseInt(req.params.variantId);
            const { action, quantity, note } = req.body;
            if (!action || quantity === undefined)
                return res
                    .status(400)
                    .json({ message: "action and quantity are required" });
            const validActions = [
                "ADD",
                "SALE",
                "REMOVE",
                "RETURN",
                "ADJUSTMENT",
            ];
            if (!validActions.includes(action))
                return res
                    .status(400)
                    .json({ message: `action must be one of: ${validActions.join(", ")}` });
            if (quantity <= 0)
                return res.status(400).json({ message: "quantity must be positive" });
            const newStock = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const stock = yield (0, product_service_1.adjustStock)(variantId, action, quantity, note, tx);
                const variant = yield tx.productVariant.findUniqueOrThrow({
                    where: { id: variantId },
                });
                yield (0, product_service_1.syncProductStock)(variant.productId, tx);
                return stock;
            }));
            return res.json({ message: "Stock updated", newStock });
        }
        catch (error) {
            if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("Insufficient stock"))
                return res.status(400).json({ message: error.message });
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
function getStockHistory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const variantId = parseInt(req.params.variantId);
            const history = yield prisma_1.default.stockHistory.findMany({
                where: { variantId },
                orderBy: { createdAt: "desc" },
            });
            return res.json({ history });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    });
}
