"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLandingPageSchema = exports.createLandingPageSchema = void 0;
const zod_1 = require("zod");
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
    extraInkProductIds: zod_1.z.array(zod_1.z.number().int().positive()).optional().default([]),
    // Simplified product fields
    productId: zod_1.z.number().int().positive().optional(),
    selectedVariantIds: zod_1.z.array(zod_1.z.number().int().positive()).optional().default([]),
});
exports.updateLandingPageSchema = exports.createLandingPageSchema;
