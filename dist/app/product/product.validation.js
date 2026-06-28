"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
const variantSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive().optional(),
    title: zod_1.z.string().min(1),
    size: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    regularPrice: zod_1.z.number().positive(),
    salePrice: zod_1.z.number().positive(),
    purchasePrice: zod_1.z.number().positive(),
    stock: zod_1.z.number().int().min(0),
    sku: zod_1.z.string().min(1),
    images: zod_1.z.array(zod_1.z.string()),
    isDefault: zod_1.z.boolean(),
    isLandingDefault: zod_1.z.boolean().optional().default(false),
    isActive: zod_1.z.boolean().optional(),
});
exports.createProductSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    seoTitle: zod_1.z.string().optional(),
    seoDescription: zod_1.z.string().optional(),
    keywords: zod_1.z.array(zod_1.z.string()).optional(),
    type: zod_1.z.enum(["seal", "ink"]),
    lowStockThreshold: zod_1.z.number().int().min(0).optional(),
    isFreeGift: zod_1.z.boolean().optional(),
    showOnLanding: zod_1.z.boolean().optional(),
    isShowAsExtraInkInLandingPage: zod_1.z.boolean().optional(),
    landingVariantMode: zod_1.z.enum(["all", "fixed"]).optional().default("all"),
    headingText: zod_1.z.string().optional(),
    youtubeVideoUrl: zod_1.z.string().optional(),
    designSampleImageUrls: zod_1.z.array(zod_1.z.string()).optional(),
    qna: zod_1.z.array(zod_1.z.object({ q: zod_1.z.string(), a: zod_1.z.string() })).optional(),
    forWhom: zod_1.z.array(zod_1.z.string()).optional(),
    forWhomHeading: zod_1.z.string().optional(),
    forWhomDescription: zod_1.z.string().optional(),
    whyNeeded: zod_1.z.array(zod_1.z.string()).optional(),
    whyNeededHeading: zod_1.z.string().optional(),
    whyNeededDescription: zod_1.z.string().optional(),
    customerReviewImageUrls: zod_1.z.array(zod_1.z.string()).optional(),
    variants: zod_1.z.array(variantSchema).min(1, "At least one variant is required"),
}).refine((data) => data.variants.filter((v) => v.isDefault).length === 1, { message: "Exactly one variant must be marked as default", path: ["variants"] }).refine((data) => data.landingVariantMode !== "fixed" || data.variants.filter((v) => v.isLandingDefault).length === 1, { message: "Fixed mode requires exactly one landing default variant", path: ["variants"] });
exports.updateProductSchema = exports.createProductSchema;
