import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { adjustStock, syncProductStock } from "../product/product.service";
import { io } from "../../index";

type TxClient = Prisma.TransactionClient;

async function applyStockForPurchase(
  items: { variantId: number; quantity: number }[],
  purchaseId: number,
  tx: TxClient
) {
  // Fetch all variants in one query
  const variantIds = items.map((i) => i.variantId);
  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, productId: true },
  });
  const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));
  const productIds = new Set<number>();

  for (const item of items) {
    const variant = variantMap[item.variantId];
    if (variant) {
      await adjustStock(item.variantId, "ADD", item.quantity, `Purchase #${purchaseId}`, tx as any);
      productIds.add(variant.productId);
    }
  }
  // Sync each unique product once, outside the per-item loop
  for (const pid of productIds) await syncProductStock(pid, tx as any);
}

export async function getPurchases(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string | undefined;
    const trash = req.query.trash === "true";

    const where: any = { isTrashed: trash };
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
        select: {
          id: true,
          supplierId: true,
          date: true,
          status: true,
          totalAmount: true,
          purchaseMoney: true,
          orderedAt: true,
          note: true,
          stockUpdated: true,
          isTrashed: true,
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
    const { supplierId, date, status, note, purchaseMoney, items } = req.body;

    if (!items?.length) return res.status(400).json({ message: "At least one item is required" });

    const totalAmount = items.reduce(
      (sum: number, i: any) => sum + i.quantity * i.purchasePrice,
      0
    );

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          supplierId: supplierId || null,
          date: new Date(date.slice(0, 10)),
          status,
          note,
          totalAmount,
          purchaseMoney: purchaseMoney || null,
          orderedAt: purchaseMoney ? new Date() : null,
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
        await tx.purchase.update({ where: { id: created.id }, data: { stockUpdated: true, receivedAt: new Date() } });
      }

      return created;
    });

    if (status === "Received") io.emit("inventory:updated");
    return res.status(201).json({ purchase });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updatePurchase(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { supplierId, date, status, note, purchaseMoney, items } = req.body;

    if (!items?.length) return res.status(400).json({ message: "At least one item is required" });

    const existing = await prisma.purchase.findUniqueOrThrow({ where: { id }, include: { items: true } });

    const totalAmount = items.reduce(
      (sum: number, i: any) => sum + i.quantity * i.purchasePrice,
      0
    );

    const purchase = await prisma.$transaction(async (tx) => {
      // Delete old items and recreate
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

      // Handle stock transitions
      const wasReceived = existing.stockUpdated;
      const nowReceived = status === "Received";

      if (wasReceived && !nowReceived) {
        // Reverse old stock
        for (const item of existing.items) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
          if (!variant) continue;
          await adjustStock(item.variantId, "REMOVE", item.quantity, `Purchase #${id} edit un-received`, tx as any);
          await syncProductStock(variant.productId, tx as any);
        }
      }

      const updated = await tx.purchase.update({
        where: { id },
        data: {
          supplierId: supplierId || null,
          date: new Date(date.slice(0, 10)),
          status,
          note,
          totalAmount,
          purchaseMoney: purchaseMoney !== undefined ? purchaseMoney : existing.purchaseMoney,
          orderedAt: purchaseMoney && !existing.purchaseMoney ? new Date() : existing.orderedAt,
          stockUpdated: nowReceived,
          receivedAt: nowReceived ? (existing.receivedAt ?? new Date()) : null,
          items: { create: items.map((i: any) => ({ variantId: i.variantId, variantTitle: i.variantTitle, productTitle: i.productTitle, quantity: i.quantity, purchasePrice: i.purchasePrice })) },
        },
        include: { items: true },
      });

      if (!wasReceived && nowReceived) {
        await applyStockForPurchase(updated.items, id, tx);
        await tx.purchase.update({ where: { id }, data: { stockUpdated: true, receivedAt: new Date() } });
      }

      return updated;
    });

    if (purchase.stockUpdated) io.emit("inventory:updated");
    return res.json({ purchase });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updatePurchaseStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { status, purchaseMoney } = req.body;

    const existing = await prisma.purchase.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      // If purchaseMoney is provided, set status to Ordered and record orderedAt
      if (purchaseMoney !== undefined && purchaseMoney !== null) {
        await tx.purchase.update({
          where: { id },
          data: {
            purchaseMoney: parseFloat(purchaseMoney),
            status: "Ordered",
            orderedAt: existing.orderedAt ?? new Date(),
          },
        });
      }

      const targetStatus = purchaseMoney !== undefined && purchaseMoney !== null ? "Ordered" : status;

      // Pending/Ordered → Received: add stock
      if (targetStatus === "Received" && !existing.stockUpdated) {
        await applyStockForPurchase(existing.items, id, tx);
        await tx.purchase.update({ where: { id }, data: { stockUpdated: true, receivedAt: new Date() } });
      }

      // Received → Pending/Ordered: reverse stock
      if (existing.stockUpdated && targetStatus !== "Received") {
        for (const item of existing.items) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
          if (!variant) continue;
          await adjustStock(item.variantId, "REMOVE", item.quantity, `Purchase #${id} un-received`, tx as any);
          await syncProductStock(variant.productId, tx as any);
        }
        await tx.purchase.update({ where: { id }, data: { stockUpdated: false, receivedAt: null } });
      }

      return tx.purchase.update({ where: { id }, data: { status: targetStatus } });
    });

    return res.json({ purchase: updated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function movePurchaseToTrash(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.purchase.update({ where: { id }, data: { isTrashed: true } });
    return res.json({ message: "Moved to trash" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function restorePurchase(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.purchase.update({ where: { id }, data: { isTrashed: false } });
    return res.json({ message: "Restored" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deletePurchase(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.purchase.delete({ where: { id } });
    return res.json({ message: "Permanently deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function emptyPurchaseTrash(_req: Request, res: Response) {
  try {
    const { count } = await prisma.purchase.deleteMany({ where: { isTrashed: true } });
    return res.json({ message: `${count} purchases permanently deleted` });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
