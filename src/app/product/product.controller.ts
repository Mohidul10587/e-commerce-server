import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { createProductSchema, updateProductSchema } from "./product.validation";
import { syncVariants, syncProductStock, adjustStock } from "./product.service";
import { StockAction } from "@prisma/client";

const productInclude = {
  variants: {
    where: { isActive: true },
    orderBy: { isDefault: "desc" as const },
  },
};

export async function getProducts(req: Request, res: Response) {
  try {
    const { type, page = "1", limit = "20", trash, search } = req.query;
    const where: any = { isTrashed: trash === "true" };
    if (type) where.type = type;
    if (search) {
      const s = search as string;
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { slug: { contains: s, mode: "insensitive" } },
        { variants: { some: { sku: { contains: s, mode: "insensitive" } } } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      products,
      total,
      page: parseInt(page as string),
      limit: take,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getFreeGiftProduct(_req: Request, res: Response) {
  try {
    const product = await prisma.product.findFirst({
      where: { isFreeGift: true, isTrashed: false },
      include: productInclude,
    });
    return res.json({ product: product ?? null });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getProductBySlug(req: Request, res: Response) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: productInclude,
    });
    if (!product || product.isTrashed)
      return res.status(404).json({ message: "Product not found" });

    // Include free gift product if this is a seal product
    let freeGiftProduct = null;
    if (product.type === "seal") {
      freeGiftProduct = await prisma.product.findFirst({
        where: { isFreeGift: true, isTrashed: false },
        include: productInclude,
      });
    }

    return res.json({ product, freeGiftProduct });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getProductById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { isDefault: "desc" as const } } },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Validation error", errors: parsed.error.flatten() });

    const { variants, ...productData } = parsed.data;

    const slugExists = await prisma.product.findUnique({
      where: { slug: productData.slug },
    });
    if (slugExists)
      return res.status(409).json({ message: "Slug already exists" });

    const skus = variants.map((v) => v.sku);
    const duplicateSku = await prisma.productVariant.findFirst({
      where: { sku: { in: skus } },
    });
    if (duplicateSku)
      return res
        .status(409)
        .json({ message: `SKU already exists: ${duplicateSku.sku}` });

    const product = await prisma.$transaction(async (tx) => {
      // Enforce single free gift product
      if (productData.isFreeGift) {
        const existing = await tx.product.findFirst({ where: { isFreeGift: true, isTrashed: false } });
        if (existing)
          throw Object.assign(new Error(`"${existing.title}" is already marked as the free gift. Remove that tag first.`), { status: 409 });
      }

      const created = await tx.product.create({
        data: {
          ...productData,
          keywords: productData.keywords ?? [],
          isFreeGift: productData.isFreeGift ?? false,
          totalStock: 0,
          variants: { create: variants.map(({ id: _id, ...v }) => v) },
        },
        include: productInclude,
      });

      for (const variant of created.variants) {
        if (variant.stock > 0) {
          await tx.stockHistory.create({
            data: {
              variantId: variant.id,
              action: "ADD",
              quantity: variant.stock,
              note: "Initial stock",
            },
          });
        }
      }

      await syncProductStock(created.id, tx as typeof prisma);
      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: productInclude,
      });
    });

    return res.status(201).json({ message: "Product created", product });
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Validation error", errors: parsed.error.flatten() });

    const { variants, ...productData } = parsed.data;

    if (productData.slug) {
      const slugExists = await prisma.product.findFirst({
        where: { slug: productData.slug, NOT: { id } },
      });
      if (slugExists)
        return res.status(409).json({ message: "Slug already exists" });
    }

    const newVariantSkus = variants.filter((v) => !v.id).map((v) => v.sku);
    if (newVariantSkus.length > 0) {
      const duplicateSku = await prisma.productVariant.findFirst({
        where: { sku: { in: newVariantSkus } },
      });
      if (duplicateSku)
        return res
          .status(409)
          .json({ message: `SKU already exists: ${duplicateSku.sku}` });
    }

    const product = await prisma.$transaction(async (tx) => {
      // Enforce single free gift product (exclude self when editing)
      if (productData.isFreeGift) {
        const existing = await tx.product.findFirst({ where: { isFreeGift: true, isTrashed: false, NOT: { id } } });
        if (existing)
          throw Object.assign(new Error(`"${existing.title}" is already marked as the free gift. Remove that tag first.`), { status: 409 });
      }

      await tx.product.update({
        where: { id },
        data: { ...productData, keywords: productData.keywords ?? [] },
      });
      await syncVariants(id, variants, tx as typeof prisma);
      await syncProductStock(id, tx as typeof prisma);
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    });

    return res.json({ message: "Product updated", product });
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function moveToTrash(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.product.update({ where: { id }, data: { isTrashed: true } });
    return res.json({ message: "Product moved to trash" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function restoreFromTrash(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.product.update({ where: { id }, data: { isTrashed: false } });
    return res.json({ message: "Product restored" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function permanentDeleteProduct(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.product.delete({ where: { id } });
    return res.json({ message: "Product permanently deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateVariantStock(req: Request, res: Response) {
  try {
    const variantId = parseInt(req.params.variantId);
    const { action, quantity, note } = req.body as {
      action: StockAction;
      quantity: number;
      note?: string;
    };

    if (!action || quantity === undefined)
      return res
        .status(400)
        .json({ message: "action and quantity are required" });

    const validActions: StockAction[] = [
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

    const newStock = await prisma.$transaction(async (tx) => {
      const stock = await adjustStock(
        variantId,
        action,
        quantity,
        note,
        tx as typeof prisma
      );
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });
      await syncProductStock(variant.productId, tx as typeof prisma);
      return stock;
    });

    return res.json({ message: "Stock updated", newStock });
  } catch (error: any) {
    if (error.message?.includes("Insufficient stock"))
      return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getStockHistory(req: Request, res: Response) {
  try {
    const variantId = parseInt(req.params.variantId);
    const history = await prisma.stockHistory.findMany({
      where: { variantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
