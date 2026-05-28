import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { io } from "../../index";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerName, customerPhone, address, city, postalCode, country, items, deliveryCharge, note } = req.body;

    if (!customerName || !customerPhone || !address || !city || !postalCode || !country || !items?.length)
      return res.status(400).json({ message: "Missing required fields" });

    let subtotal = 0;
    const resolvedItems: { variantId: number; title: string; price: number; quantity: number; sealText: string | null }[] = [];

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
        sealText: variant.product.type === "seal" ? (item.sealText || null) : null,
      });
    }

    const charge = Number(deliveryCharge) || 0;
    const order = await prisma.order.create({
      data: {
        customerName, customerPhone, address, city, postalCode, country,
        subtotal, deliveryCharge: charge, total: subtotal + charge,
        note: note || null,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });

    for (const item of resolvedItems) {
      await prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
      await prisma.stockHistory.create({ data: { variantId: item.variantId, action: "SALE", quantity: item.quantity, note: `Order #${order.id}` } });
    }

    const productIds = [...new Set(
      (await prisma.productVariant.findMany({ where: { id: { in: resolvedItems.map((i) => i.variantId) } }, select: { productId: true } }))
        .map((v) => v.productId)
    )];
    for (const productId of productIds) {
      const agg = await prisma.productVariant.aggregate({ where: { productId }, _sum: { stock: true } });
      await prisma.product.update({ where: { id: productId }, data: { totalStock: agg._sum.stock ?? 0 } });
    }

    io.emit("order:new", order);

    return res.status(201).json({ message: "Order placed successfully", order });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const { trash, search, page = "1", limit = "10" } = req.query;
    const where: any = { isTrashed: trash === "true" };

    if (search) {
      const s = search as string;
      where.OR = [
        { customerName: { contains: s, mode: "insensitive" } },
        { customerPhone: { contains: s, mode: "insensitive" } },
        { city: { contains: s, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.order.count({ where }),
    ]);

    return res.json({ orders, total, page: parseInt(page as string), limit: take });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: { items: true } });
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
      include: { items: true },
    });
    io.emit("order:updated", order);
    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { customerName, customerPhone, address, city, postalCode, country, note, status } = req.body;
    const data: any = {};
    if (customerName) data.customerName = customerName;
    if (customerPhone) data.customerPhone = customerPhone;
    if (address) data.address = address;
    if (city) data.city = city;
    if (postalCode) data.postalCode = postalCode;
    if (country) data.country = country;
    if (note !== undefined) data.note = note;
    if (status) data.status = status;

    const order = await prisma.order.update({ where: { id }, data, include: { items: true } });
    io.emit("order:updated", order);
    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderItemSealText = async (req: Request, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const { sealText } = req.body;
    const item = await prisma.orderItem.update({ where: { id: itemId }, data: { sealText: sealText ?? null } });
    return res.json({ item });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const moveOrderToTrash = async (req: Request, res: Response) => {
  try {
    await prisma.order.update({ where: { id: Number(req.params.id) }, data: { isTrashed: true } });
    io.emit("order:trashed", { id: Number(req.params.id) });
    return res.json({ message: "Order moved to trash" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const restoreOrder = async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { isTrashed: false },
      include: { items: true },
    });
    io.emit("order:restored", order);
    return res.json({ message: "Order restored" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const permanentDeleteOrder = async (req: Request, res: Response) => {
  try {
    await prisma.order.delete({ where: { id: Number(req.params.id) } });
    io.emit("order:deleted", { id: Number(req.params.id) });
    return res.json({ message: "Order permanently deleted" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const bulkTrashOrders = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "ids array is required" });

    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { isTrashed: true } });
    io.emit("order:trashed", { ids });
    return res.json({ message: `${ids.length} orders moved to trash` });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const bulkRestoreOrders = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "ids array is required" });

    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { isTrashed: false } });
    io.emit("order:restored", { ids });
    return res.json({ message: `${ids.length} orders restored` });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const bulkUpdateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status)
      return res.status(400).json({ message: "ids array and status are required" });

    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { status } });
    io.emit("order:updated", { ids, status });
    return res.json({ message: `${ids.length} orders updated to "${status}"` });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderPayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { paidAmount } = req.body;

    if (paidAmount === undefined || isNaN(Number(paidAmount)) || Number(paidAmount) < 0)
      return res.status(400).json({ message: "Valid paidAmount is required" });

    const paid = Number(paidAmount);

    // Fetch total to compute paymentStatus
    const existing = await prisma.order.findUnique({ where: { id }, select: { total: true } });
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const paymentStatus =
      paid <= 0 ? "unpaid" : paid >= existing.total ? "paid" : "partial";

    const order = await prisma.order.update({
      where: { id },
      data: { paidAmount: paid, paymentStatus },
      include: { items: true },
    });

    io.emit("order:updated", order);
    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};
