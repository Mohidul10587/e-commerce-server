import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { createCategorySchema, updateCategorySchema } from "./category.validation";

export async function getCategories(_req: Request, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({ categories });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getCategoryById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.json({ category });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });

    const existing = await prisma.category.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return res.status(409).json({ message: "Slug already exists" });

    const category = await prisma.category.create({ data: parsed.data });
    return res.status(201).json({ message: "Category created", category });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });

    if (parsed.data.slug) {
      const existing = await prisma.category.findFirst({
        where: { slug: parsed.data.slug, NOT: { id } },
      });
      if (existing) return res.status(409).json({ message: "Slug already exists" });
    }

    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    return res.json({ message: "Category updated", category });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.category.delete({ where: { id } });
    return res.json({ message: "Category deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
