import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerName, customerPhone, address, city, postalCode, country, items, deliveryCharge, note } = req.body;

    if (!customerName || !customerPhone || !address || !city || !postalCode || !country || !items?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate variants and compute subtotal
    let subtotal = 0;
    const resolvedItems: { variantId: number; title: string; price: number; quantity: number }[] = [];

    for (const item of items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: Number(item.variantId) },
        include: { product: true },
      });
      if (!variant) return res.status(400).json({ message: `Variant ${item.variantId} not found` });
      if (variant.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${variant.product.title}` });

      subtotal += variant.salePrice * item.quantity;
      resolvedItems.push({
        variantId: variant.id,
        title: `${variant.product.title} — ${variant.title}`,
        price: variant.salePrice,
        quantity: item.quantity,
      });
    }

    const charge = Number(deliveryCharge) || 0;
    const total = subtotal + charge;

    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        address,
        city,
        postalCode,
        country,
        subtotal,
        deliveryCharge: charge,
        total,
        note: note || null,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });

    // Deduct stock
    for (const item of resolvedItems) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
      await prisma.stockHistory.create({
        data: { variantId: item.variantId, action: "SALE", quantity: item.quantity, note: `Order #${order.id}` },
      });
    }

    // Update product totalStock
    const variantIds = resolvedItems.map((i) => i.variantId);
    const affectedProducts = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { productId: true },
    });
    const productIds = [...new Set(affectedProducts.map((v) => v.productId))];
    for (const productId of productIds) {
      const agg = await prisma.productVariant.aggregate({ where: { productId }, _sum: { stock: true } });
      await prisma.product.update({ where: { id: productId }, data: { totalStock: agg._sum.stock ?? 0 } });
    }

    return res.status(201).json({ message: "Order placed successfully", order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ orders });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};
