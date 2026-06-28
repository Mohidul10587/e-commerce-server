"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLandingPageSchema = exports.createLandingPageSchema = void 0;
const zod_1 = require("zod");
const landingPageProductSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive().optional(),
    productId: zod_1.z.number().int().positive(),
    selectedVariantIds: zod_1.z.array(zod_1.z.number().int().positive()).default([]),
    displayOrder: zod_1.z.number().int().min(0).default(0),
});
exports.createLandingPageSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    isActive: zod_1.z.boolean().optional().default(true),
    headingText: zod_1.z.string().optional(),
    youtubeVideoUrl: zod_1.z.string().optional(),
    heroDesktopImageUrls: zod_1.z.array(zod_1.z.string()).optional().default([]),
    heroMobileImageUrls: zod_1.z.array(zod_1.z.string()).optional().default([]),
    designSampleImageUrls: zod_1.z.array(zod_1.z.string()).optional().default([]),
    qna: zod_1.z.array(zod_1.z.object({ q: zod_1.z.string(), a: zod_1.z.string() })).optional(),
    forWhom: zod_1.z.array(zod_1.z.string()).optional().default([]),
    forWhomHeading: zod_1.z.string().optional(),
    forWhomDescription: zod_1.z.string().optional(),
    whyNeeded: zod_1.z.array(zod_1.z.string()).optional().default([]),
    whyNeededHeading: zod_1.z.string().optional(),
    whyNeededDescription: zod_1.z.string().optional(),
    customerReviewImageUrls: zod_1.z.array(zod_1.z.string()).optional().default([]),
    products: zod_1.z.array(landingPageProductSchema).optional().default([]),
});
exports.updateLandingPageSchema = exports.createLandingPageSchema;
