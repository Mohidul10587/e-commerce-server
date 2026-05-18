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
  categoryId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
}).refine(
  (data) => data.variants.filter((v) => v.isDefault).length === 1,
  { message: "Exactly one variant must be marked as default", path: ["variants"] }
);

export const updateProductSchema = createProductSchema;
