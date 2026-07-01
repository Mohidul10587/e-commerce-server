import { z } from "zod";

export const createLandingPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  isActive: z.boolean().optional().default(true),
  headingText: z.string().optional(),
  youtubeVideoUrl: z.string().optional(),
  heroDesktopImageUrls: z.array(z.string()).optional().default([]),
  heroMobileImageUrls: z.array(z.string()).optional().default([]),
  designSampleImageUrls: z.array(z.string()).optional().default([]),
  qna: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  forWhom: z.array(z.string()).optional().default([]),
  forWhomHeading: z.string().optional(),
  forWhomDescription: z.string().optional(),
  whyNeeded: z.array(z.string()).optional().default([]),
  whyNeededHeading: z.string().optional(),
  whyNeededDescription: z.string().optional(),
  customerReviewImageUrls: z.array(z.string()).optional().default([]),
  extraInkProductIds: z.array(z.number().int().positive()).optional().default([]),
  // Simplified product fields
  productId: z.number().int().positive().optional(),
  selectedVariantIds: z.array(z.number().int().positive()).optional().default([]),
});

export const updateLandingPageSchema = createLandingPageSchema;
