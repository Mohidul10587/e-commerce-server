import prisma from "../../lib/prisma";
import { VariantInput } from "./product.types";
import { StockAction } from "@prisma/client";

/**
 * Recalculates totalStock from all active variants and updates the product.
 * Call this inside a transaction by passing the tx client.
 */
export async function syncProductStock(
  productId: number,
  tx: typeof prisma = prisma
) {
  const result = await tx.productVariant.aggregate({
    where: { productId, isActive: true },
    _sum: { stock: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: { totalStock: result._sum.stock ?? 0 },
  });
}

/**
 * Adjusts a variant's stock and writes a StockHistory record.
 * quantity is always a positive number; action determines direction.
 */
export async function adjustStock(
  variantId: number,
  action: StockAction,
  quantity: number,
  note?: string,
  tx: typeof prisma = prisma
) {
  const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });

  const delta =
    action === "ADD" || action === "RETURN" ? quantity
    : action === "SALE" || action === "REMOVE" ? -quantity
    : quantity; // ADJUSTMENT: caller passes signed quantity directly

  const newStock = variant.stock + delta;
  if (newStock < 0) throw new Error(`Insufficient stock for variant ${variantId}`);

  await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: newStock },
  });

  await tx.stockHistory.create({
    data: { variantId, action, quantity, note },
  });

  return newStock;
}

/**
 * Syncs variants during a product update:
 * - Creates new variants (no id)
 * - Updates existing variants (has id)
 * - Soft-deletes variants missing from the incoming list
 */
export async function syncVariants(
  productId: number,
  incomingVariants: VariantInput[],
  tx: typeof prisma = prisma
) {
  const existingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true, stock: true },
  });

  const incomingIds = incomingVariants
    .filter((v) => v.id !== undefined)
    .map((v) => v.id as number);

  // Soft-delete variants not present in the incoming list
  const toDeactivate = existingVariants
    .filter((v) => !incomingIds.includes(v.id))
    .map((v) => v.id);

  if (toDeactivate.length > 0) {
    await tx.productVariant.updateMany({
      where: { id: { in: toDeactivate } },
      data: { isActive: false, stock: 0 },
    });
  }

  for (const variant of incomingVariants) {
    const { id, ...data } = variant;

    if (id) {
      // Update existing variant
      const existing = existingVariants.find((v) => v.id === id);
      if (existing && existing.stock !== data.stock) {
        const diff = data.stock - existing.stock;
        const action: StockAction = diff > 0 ? "ADJUSTMENT" : "ADJUSTMENT";
        await tx.stockHistory.create({
          data: { variantId: id, action, quantity: Math.abs(diff), note: "Manual adjustment on update" },
        });
      }
      await tx.productVariant.update({ where: { id }, data });
    } else {
      // Create new variant
      const created = await tx.productVariant.create({
        data: { ...data, productId },
      });
      if (created.stock > 0) {
        await tx.stockHistory.create({
          data: { variantId: created.id, action: "ADD", quantity: created.stock, note: "Initial stock on create" },
        });
      }
    }
  }
}
