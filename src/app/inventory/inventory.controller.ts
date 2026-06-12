import { Request, Response } from "express";
import prisma from "../../lib/prisma";

const LOW_STOCK_THRESHOLD = 5;

export async function getInventoryStats(_req: Request, res: Response) {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      variants,
      totalProducts,
      stockHistory,
      purchases,
      lowStockProducts,
      outOfStockProducts,
    ] = await Promise.all([
      prisma.productVariant.findMany({
        where: { isActive: true },
        select: { id: true, stock: true, purchasePrice: true, productId: true },
      }),
      prisma.product.count({ where: { isTrashed: false } }),
      prisma.stockHistory.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { action: true, quantity: true, createdAt: true },
      }),
      prisma.purchase.findMany({
        where: { createdAt: { gte: monthStart } },
        select: {
          totalAmount: true,
          createdAt: true,
          status: true,
          items: { select: { quantity: true } },
        },
      }),
      prisma.product.findMany({
        where: {
          isTrashed: false,
          variants: {
            some: {
              isActive: true,
              stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
            },
          },
        },
        select: {
          id: true,
          title: true,
          variants: {
            where: {
              isActive: true,
              stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
            },
            select: { id: true, title: true, sku: true, stock: true },
          },
        },
        take: 10,
      }),
      prisma.product.findMany({
        where: {
          isTrashed: false,
          variants: { some: { isActive: true, stock: 0 } },
        },
        select: {
          id: true,
          title: true,
          variants: {
            where: { isActive: true, stock: 0 },
            select: { id: true, title: true, sku: true, stock: true },
          },
        },
        take: 10,
      }),
    ]);

    // Stock overview
    const totalStock = variants.reduce((s, v) => s + v.stock, 0);
    const totalStockValue = variants.reduce(
      (s, v) => s + v.stock * v.purchasePrice,
      0
    );
    const totalVariants = variants.length;
    const uniqueProductIds = new Set(variants.map((v) => v.productId)).size;

    // Stock movement helpers
    function movement(
      action: "ADD" | "SALE" | "REMOVE" | "RETURN",
      since: Date
    ) {
      return stockHistory
        .filter((h) => h.action === action && new Date(h.createdAt) >= since)
        .reduce((s, h) => s + h.quantity, 0);
    }

    // Purchase summary helpers
    function purchaseSummary(since: Date) {
      const filtered = purchases.filter((p) => new Date(p.createdAt) >= since);
      return {
        amount: filtered.reduce((s, p) => s + p.totalAmount, 0),
        qty: filtered.reduce(
          (s, p) => s + p.items.reduce((a, i) => a + i.quantity, 0),
          0
        ),
        count: filtered.length,
      };
    }

    return res.json({
      stock: {
        totalStock,
        totalStockValue,
        totalProducts,
        totalVariants,
        lowStockCount: lowStockProducts.reduce(
          (s, p) => s + p.variants.length,
          0
        ),
        outOfStockCount: outOfStockProducts.reduce(
          (s, p) => s + p.variants.length,
          0
        ),
      },
      movement: {
        daily: {
          in: movement("ADD", todayStart),
          out: movement("SALE", todayStart) + movement("REMOVE", todayStart),
        },
        weekly: {
          in: movement("ADD", weekStart),
          out: movement("SALE", weekStart) + movement("REMOVE", weekStart),
        },
        monthly: {
          in: movement("ADD", monthStart),
          out: movement("SALE", monthStart) + movement("REMOVE", monthStart),
        },
      },
      purchase: {
        total: purchaseSummary(new Date(0)),
        today: purchaseSummary(todayStart),
        week: purchaseSummary(weekStart),
        month: purchaseSummary(monthStart),
      },
      alerts: { lowStockProducts, outOfStockProducts },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getStockList(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const stockStatus = req.query.stockStatus as string;

    const where: any = { isTrashed: false };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        {
          variants: {
            some: { sku: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    // stock status filter applied via variants post-query for simplicity
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { isDefault: "desc" },
          },
        },
        orderBy: { title: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // filter by stock status if provided
    const filtered = stockStatus
      ? products.filter((p) => {
          if (stockStatus === "out")
            return p.variants.some((v) => v.stock === 0);
          if (stockStatus === "low")
            return p.variants.some(
              (v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD
            );
          if (stockStatus === "in")
            return p.variants.some((v) => v.stock > LOW_STOCK_THRESHOLD);
          return true;
        })
      : products;

    return res.json({ products: filtered, total });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateVariantInline(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { stock, purchasePrice, regularPrice, salePrice } = req.body;

    const current = await prisma.productVariant.findUniqueOrThrow({
      where: { id },
    });

    await prisma.$transaction(async (tx) => {
      if (stock !== undefined && stock !== current.stock) {
        const diff = stock - current.stock;
        await tx.stockHistory.create({
          data: {
            variantId: id,
            action: "ADJUSTMENT",
            quantity: Math.abs(diff),
            note: "Inline stock edit",
          },
        });
      }
      await tx.productVariant.update({
        where: { id },
        data: {
          ...(stock !== undefined && { stock }),
          ...(purchasePrice !== undefined && { purchasePrice }),
          ...(regularPrice !== undefined && { regularPrice }),
          ...(salePrice !== undefined && { salePrice }),
        },
      });
      // sync parent totalStock
      const agg = await tx.productVariant.aggregate({
        where: { productId: current.productId, isActive: true },
        _sum: { stock: true },
      });
      await tx.product.update({
        where: { id: current.productId },
        data: { totalStock: agg._sum.stock ?? 0 },
      });
    });

    return res.json({ message: "Updated" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getMonthlyChartData(_req: Request, res: Response) {
  try {
    const months: {
      label: string;
      stockIn: number;
      stockOut: number;
      purchaseAmount: number;
    }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const [history, purchaseAmt] = await Promise.all([
        prisma.stockHistory.findMany({
          where: { createdAt: { gte: start, lt: end } },
          select: { action: true, quantity: true },
        }),
        prisma.purchase.aggregate({
          where: { createdAt: { gte: start, lt: end } },
          _sum: { totalAmount: true },
        }),
      ]);

      months.push({
        label: start.toLocaleString("en", { month: "short", year: "2-digit" }),
        stockIn: history
          .filter((h) => h.action === "ADD" || h.action === "RETURN")
          .reduce((s, h) => s + h.quantity, 0),
        stockOut: history
          .filter((h) => h.action === "SALE" || h.action === "REMOVE")
          .reduce((s, h) => s + h.quantity, 0),
        purchaseAmount: purchaseAmt._sum.totalAmount ?? 0,
      });
    }

    return res.json({ months });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getStockMovementByDateRange(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate)
      return res.status(400).json({ message: "startDate and endDate are required" });

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const [history, orderedPurchases, receivedPurchases] = await Promise.all([
      prisma.stockHistory.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { action: true, quantity: true },
      }),
      prisma.purchase.findMany({
        where: {
          isTrashed: false,
          status: "Ordered",
          date: { gte: start, lte: end },
        },
        select: { purchaseMoney: true, items: { select: { quantity: true } } },
      }),
      prisma.purchase.findMany({
        where: {
          isTrashed: false,
          status: "Received",
          receivedAt: { gte: start, lte: end },
        },
        select: { purchaseMoney: true, items: { select: { quantity: true } } },
      }),
    ]);

    const stockOut = history
      .filter((h) => h.action === "SALE" || h.action === "REMOVE")
      .reduce((sum, h) => sum + h.quantity, 0);

    const stockIn = receivedPurchases.reduce(
      (sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0),
      0
    );
    const purchaseAmount = [...orderedPurchases, ...receivedPurchases].reduce(
      (sum, p) => sum + (p.purchaseMoney ?? 0),
      0
    );

    return res.json({ stockIn, stockOut, purchaseAmount });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
