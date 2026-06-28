import { z } from "zod";

const landingPageProductSchema = z.object({
  id: z.number().int().positive().optional(),
  productId: z.number().int().positive(),
  selectedVariantIds: z.array(z.number().int().positive()).default([]),
  displayOrder: z.number().int().min(0).default(0),
});

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
  products: z.array(landingPageProductSchema).optional().default([]),
});

export const updateLandingPageSchema = createLandingPageSchema;
