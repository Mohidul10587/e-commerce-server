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
    isActive: zod_1.z.boolean().optional(),
    variants: zod_1.z.array(variantSchema).min(1, "At least one variant is required"),
}).refine((data) => data.variants.filter((v) => v.isDefault).length === 1, { message: "Exactly one variant must be marked as default", path: ["variants"] });
exports.updateProductSchema = exports.createProductSchema;
