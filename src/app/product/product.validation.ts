import { z } from "zod";

const variantSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  regularPrice: z.number().positive(),
  salePrice: z.number().positive(),
  purchasePrice: z.number().positive(),
  stock: z.number().int().min(0),
  sku: z.string().min(1),
  images: z.array(z.string()),
  isDefault: z.boolean(),
  isLandingDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional(),
});

export const createProductSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  type: z.enum(["seal", "ink"]),
  lowStockThreshold: z.number().int().min(0).optional(),
  isFreeGift: z.boolean().optional(),
  showOnLanding: z.boolean().optional(),
  isShowAsExtraInkInLandingPage: z.boolean().optional(),
  landingVariantMode: z.enum(["all", "fixed"]).optional().default("all"),
  headingText: z.string().optional(),
  youtubeVideoUrl: z.string().optional(),
  designSampleImageUrls: z.array(z.string()).optional(),
  qna: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  forWhom: z.array(z.string()).optional(),
  forWhomHeading: z.string().optional(),
  forWhomDescription: z.string().optional(),
  whyNeeded: z.array(z.string()).optional(),
  whyNeededHeading: z.string().optional(),
  whyNeededDescription: z.string().optional(),
  customerReviewImageUrls: z.array(z.string()).optional(),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
}).refine(
  (data) => data.variants.filter((v) => v.isDefault).length === 1,
  { message: "Exactly one variant must be marked as default", path: ["variants"] }
).refine(
  (data) => data.landingVariantMode !== "fixed" || data.variants.filter((v) => v.isLandingDefault).length === 1,
  { message: "Fixed mode requires exactly one landing default variant", path: ["variants"] }
);

export const updateProductSchema = createProductSchema;
