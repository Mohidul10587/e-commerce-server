import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { localDayRange } from "../../lib/dateRange";
import { io } from "../../index";

const LOW_STOCK_THRESHOLD = 5; // fallback only for variants without product threshold

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
      stockMovement,
      purchaseStats,
      allProductsForLowStock,
      outOfStockProducts,
    ] = await Promise.all([
      prisma.productVariant.findMany({
        where: { isActive: true },
        select: { id: true, stock: true, purchasePrice: true, productId: true },
      }),
      prisma.product.count({ where: { isTrashed: false } }),
      prisma.stockHistory.groupBy({
        by: ["action"],
        where: { createdAt: { gte: monthStart } },
        _sum: { quantity: true },
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
        where: { isTrashed: false, totalStock: { gt: 0 } },
        select: {
          id: true,
          title: true,
          totalStock: true,
          variants: {
            where: { isActive: true, stock: { gt: 0 } },
            select: { id: true, title: true, sku: true, stock: true, lowStockThreshold: true },
          },
        },
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

    // Build a map for quick action → quantity lookup
    const movementMap = Object.fromEntries(
      stockMovement.map((g) => [g.action, g._sum.quantity ?? 0])
    );

    // Stock overview
    const totalStock = variants.reduce((s, v) => s + v.stock, 0);
    const totalStockValue = variants.reduce(
      (s, v) => s + v.stock * v.purchasePrice,
      0
    );
    const totalVariants = variants.length;
    const uniqueProductIds = new Set(variants.map((v) => v.productId)).size;

    // Filter low stock using per-product threshold
    const lowStockProducts = allProductsForLowStock
      .map((p: any) => ({
        ...p,
        variants: p.variants.filter((v: any) => {
          const threshold = v.lowStockThreshold > 0 ? v.lowStockThreshold : LOW_STOCK_THRESHOLD;
          return v.stock > 0 && v.stock <= threshold;
        }),
      }))
      .filter((p: any) => p.variants.length > 0)
      .slice(0, 10);

    // Stock movement helpers — use per-action sums from DB groupBy
    // For daily/weekly breakdowns we still need the full history within those sub-ranges.
    // We fetch them lazily only when needed using the already-aggregated map for the monthly total.
    // For daily/weekly we issue two small targeted queries.
    const [dailyMovement, weeklyMovement] = await Promise.all([
      prisma.stockHistory.groupBy({
        by: ["action"],
        where: { createdAt: { gte: todayStart } },
        _sum: { quantity: true },
      }),
      prisma.stockHistory.groupBy({
        by: ["action"],
        where: { createdAt: { gte: weekStart } },
        _sum: { quantity: true },
      }),
    ]);

    const dailyMap = Object.fromEntries(dailyMovement.map((g) => [g.action, g._sum.quantity ?? 0]));
    const weeklyMap = Object.fromEntries(weeklyMovement.map((g) => [g.action, g._sum.quantity ?? 0]));
    const monthlyMap = movementMap;

    // Purchase summary helpers
    function purchaseSummary(since: Date) {
      const filtered = purchaseStats.filter((p) => new Date(p.createdAt) >= since);
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
          in: dailyMap["ADD"] ?? 0,
          out: Math.max(0, (dailyMap["SALE"] ?? 0) + (dailyMap["REMOVE"] ?? 0) - (dailyMap["RETURN"] ?? 0)),
        },
        weekly: {
          in: weeklyMap["ADD"] ?? 0,
          out: Math.max(0, (weeklyMap["SALE"] ?? 0) + (weeklyMap["REMOVE"] ?? 0) - (weeklyMap["RETURN"] ?? 0)),
        },
        monthly: {
          in: monthlyMap["ADD"] ?? 0,
          out: Math.max(0, (monthlyMap["SALE"] ?? 0) + (monthlyMap["REMOVE"] ?? 0) - (monthlyMap["RETURN"] ?? 0)),
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
          if (stockStatus === "out") return p.variants.some((v) => v.stock === 0);
          if (stockStatus === "low") return p.variants.some((v) => {
            const threshold = v.lowStockThreshold > 0 ? v.lowStockThreshold : LOW_STOCK_THRESHOLD;
            return v.stock > 0 && v.stock <= threshold;
          });
          if (stockStatus === "in") return p.variants.every((v) => {
            const threshold = v.lowStockThreshold > 0 ? v.lowStockThreshold : LOW_STOCK_THRESHOLD;
            return v.stock > threshold;
          });
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

    io.emit("inventory:updated", { variantId: id, productId: current.productId });
    return res.json({ message: "Updated" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getMonthlyChartData(_req: Request, res: Response) {
  try {
    const now = new Date();

    // Build all date ranges upfront
    const ranges = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = start.toLocaleString("en", { month: "short", year: "2-digit" });
      return { start, end, label };
    });

    // Fire all 12 queries at once
    const queries = ranges.flatMap(({ start, end }) => [
      prisma.stockHistory.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { action: true, quantity: true },
      }),
      prisma.purchase.aggregate({
        where: { createdAt: { gte: start, lt: end } },
        _sum: { totalAmount: true },
      }),
    ]);

    const results = await Promise.all(queries);

    const months = ranges.map(({ label }, idx) => {
      const history = results[idx * 2] as { action: string; quantity: number }[];
      const purchaseAmt = results[idx * 2 + 1] as { _sum: { totalAmount: number | null } };
      return {
        label,
        stockIn: history
          .filter((h) => h.action === "ADD")
          .reduce((s, h) => s + h.quantity, 0),
        stockOut: Math.max(0, history
          .filter((h) => h.action === "SALE" || h.action === "REMOVE")
          .reduce((s, h) => s + h.quantity, 0) - history
          .filter((h) => h.action === "RETURN")
          .reduce((s, h) => s + h.quantity, 0)),
        purchaseAmount: purchaseAmt._sum.totalAmount ?? 0,
      };
    });

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

    const tzOffset = parseInt(req.query.tzOffset as string) || 0;
    const { gte: start } = localDayRange(startDate as string, tzOffset);
    const { lte: end } = localDayRange(endDate as string, tzOffset);

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

    const stockOut = Math.max(0, history
      .filter((h) => h.action === "SALE" || h.action === "REMOVE")
      .reduce((sum, h) => sum + h.quantity, 0) - history
      .filter((h) => h.action === "RETURN")
      .reduce((sum, h) => sum + h.quantity, 0));

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
