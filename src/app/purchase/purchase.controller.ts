import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { adjustStock, syncProductStock } from "../product/product.service";

type TxClient = Prisma.TransactionClient;

async function applyStockForPurchase(
  items: { variantId: number; quantity: number }[],
  purchaseId: number,
  tx: TxClient
) {
  const productIds = new Set<number>();
  for (const item of items) {
    const variant = await tx.productVariant.findUnique({
      where: { id: item.variantId },
      select: { productId: true },
    });
    if (variant) {
      await adjustStock(item.variantId, "ADD", item.quantity, `Purchase #${purchaseId}`, tx as any);
      productIds.add(variant.productId);
    }
  }
  for (const pid of productIds) await syncProductStock(pid, tx as any);
}

export async function getPurchases(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { items: { some: { productTitle: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    return res.json({ purchases, total });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function createPurchase(req: Request, res: Response) {
  try {
    const { supplierId, date, status, note, items } = req.body;

    if (!items?.length) return res.status(400).json({ message: "At least one item is required" });

    const totalAmount = items.reduce(
      (sum: number, i: any) => sum + i.quantity * i.purchasePrice,
      0
    );

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          supplierId: supplierId || null,
          date: new Date(date),
          status,
          note,
          totalAmount,
          items: {
            create: items.map((i: any) => ({
              variantId: i.variantId,
              variantTitle: i.variantTitle,
              productTitle: i.productTitle,
              quantity: i.quantity,
              purchasePrice: i.purchasePrice,
            })),
          },
        },
        include: { items: true },
      });

      if (status === "Received") {
        await applyStockForPurchase(created.items, created.id, tx);
        await tx.purchase.update({ where: { id: created.id }, data: { stockUpdated: true } });
      }

      return created;
    });

    return res.status(201).json({ purchase });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updatePurchaseStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const existing = await prisma.purchase.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });

    if (existing.stockUpdated && status === "Received") {
      return res.status(400).json({ message: "Stock already updated for this purchase" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id },
        data: { status },
      });

      if (status === "Received" && !existing.stockUpdated) {
        await applyStockForPurchase(existing.items, id, tx);
        await tx.purchase.update({ where: { id }, data: { stockUpdated: true } });
      }

      return purchase;
    });

    return res.json({ purchase: updated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deletePurchase(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.purchase.findUniqueOrThrow({ where: { id } });
    if (existing.stockUpdated) {
      return res.status(400).json({ message: "Cannot delete a received purchase (stock already updated)" });
    }
    await prisma.purchase.delete({ where: { id } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
