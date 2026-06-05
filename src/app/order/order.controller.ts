import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { io } from "../../index";

const VALID_STATUSES = [
  "Processing",
  "WaitForDesign",
  "DesignSubmitted",
  "Revision",
  "CustomerInformed",
  "NeedToCall",
  "NoResponse",
  "OrderConfirmed",
  "InProduction",
  "InReview",
  "Pending",
  "Delivered",
  "PartlyDelivered",
  "Cancel",
];

export const getOrderStatusCounts = async (_req: Request, res: Response) => {
  try {
    const [all, trash, ...rest] = await Promise.all([
      prisma.order.count({ where: { isTrashed: false } }),
      prisma.order.count({ where: { isTrashed: true } }),
      ...VALID_STATUSES.map((s) =>
        prisma.order.count({ where: { isTrashed: false, status: s as any } })
      ),
      prisma.order.count({
        where: { isTrashed: false, paymentStatus: "unpaid" },
      }),
      prisma.order.count({
        where: { isTrashed: false, paymentStatus: "partial" },
      }),
      prisma.order.count({
        where: { isTrashed: false, paymentStatus: "paid" },
      }),
    ]);
    const counts: Record<string, number> = { all, trash };
    VALID_STATUSES.forEach((s, i) => {
      counts[s] = rest[i];
    });
    const offset = VALID_STATUSES.length;
    counts["unpaid"] = rest[offset];
    counts["partial"] = rest[offset + 1];
    counts["paid"] = rest[offset + 2];
    return res.json(counts);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      customerPhone,
      address,
      items,
      deliveryCharge,
      note,
      discount,
      discountPercent,
    } = req.body;

    if (!customerName || !customerPhone || !address || !items?.length)
      return res.status(400).json({ message: "Missing required fields" });

    let subtotal = 0;
    const resolvedItems: {
      variantId: number;
      title: string;
      price: number;
      quantity: number;
      sealText: string | null;
      isFreeItem: boolean;
    }[] = [];

    for (const item of items) {
      const isFree = !!item.isFreeItem;
      const variant = await prisma.productVariant.findUnique({
        where: { id: Number(item.variantId) },
        include: { product: true },
      });
      if (!variant)
        return res
          .status(400)
          .json({ message: `Variant ${item.variantId} not found` });
      if (variant.stock < item.quantity)
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${variant.product.title}` });

      const price = isFree ? 0 : variant.salePrice;
      subtotal += price * item.quantity;
      resolvedItems.push({
        variantId: variant.id,
        title: `${variant.product.title} — ${variant.title}`,
        price,
        quantity: item.quantity,
        sealText:
          variant.product.type === "seal" ? item.sealText || null : null,
        isFreeItem: isFree,
      });
    }

    const charge = Number(deliveryCharge) || 0;
    const disc = Number(discount) >= 0 ? Number(discount) : 0;
    const discPct = Number(discountPercent) >= 0 ? Number(discountPercent) : 0;
    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        address,
        subtotal,
        deliveryCharge: charge,
        total: subtotal + charge - disc,
        discount: disc,
        discountPercent: discPct,
        note: note || null,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });

    for (const item of resolvedItems) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
      await prisma.stockHistory.create({
        data: {
          variantId: item.variantId,
          action: "SALE",
          quantity: item.quantity,
          note: `Order #${order.id}`,
        },
      });
    }

    const productIds = [
      ...new Set(
        (
          await prisma.productVariant.findMany({
            where: { id: { in: resolvedItems.map((i) => i.variantId) } },
            select: { productId: true },
          })
        ).map((v) => v.productId)
      ),
    ];
    for (const productId of productIds) {
      const agg = await prisma.productVariant.aggregate({
        where: { productId },
        _sum: { stock: true },
      });
      await prisma.product.update({
        where: { id: productId },
        data: { totalStock: agg._sum.stock ?? 0 },
      });
    }

    io.emit("order:new", order);

    return res
      .status(201)
      .json({ message: "Order placed successfully", order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const {
      trash,
      search,
      page = "1",
      limit = "10",
      status,
      payment,
      sort,
    } = req.query;
    const where: any = { isTrashed: trash === "true" };

    if (search) {
      const s = search as string;
      where.OR = [
        { customerName: { contains: s, mode: "insensitive" } },
        { customerPhone: { contains: s, mode: "insensitive" } },
      ];
    }

    if (status) where.status = status;
    if (payment) where.paymentStatus = payment;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    const orderDir = sort === "asc" ? "asc" : "desc";

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: orderDir },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      orders,
      total,
      page: parseInt(page as string),
      limit: take,
    });
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
    const {
      customerName,
      customerPhone,
      address,
      status,
      discount,
      discountPercent,
      paidAmount,
      items,
    } = req.body;
    const data: any = {};
    if (customerName) data.customerName = customerName;
    if (customerPhone) data.customerPhone = customerPhone;
    if (address) data.address = address;
    if (status) data.status = status;

    // Replace items if provided
    if (Array.isArray(items)) {
      // Resolve each item's price from DB
      let subtotal = 0;
      const resolved: {
        variantId: number;
        title: string;
        price: number;
        quantity: number;
        sealText: string | null;
        isFreeItem: boolean;
      }[] = [];
      for (const item of items) {
        const isFree = !!item.isFreeItem;
        const variant = await prisma.productVariant.findUnique({
          where: { id: Number(item.variantId) },
          include: { product: true },
        });
        if (!variant)
          return res
            .status(400)
            .json({ message: `Variant ${item.variantId} not found` });
        const qty = Number(item.quantity) || 1;
        const price = isFree ? 0 : variant.salePrice;
        subtotal += price * qty;
        resolved.push({
          variantId: variant.id,
          title: `${variant.product.title} — ${variant.title}`,
          price,
          quantity: qty,
          sealText:
            variant.product.type === "seal" ? item.sealText || null : null,
          isFreeItem: isFree,
        });
      }
      // Delete old items and create new ones
      await prisma.orderItem.deleteMany({ where: { orderId: id } });
      data.subtotal = subtotal;
      data.items = { create: resolved };
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { subtotal: true, deliveryCharge: true, total: true },
    });
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const subtotal = data.subtotal ?? existing.subtotal;
    const deliveryCharge = existing.deliveryCharge;
    const disc =
      discount !== undefined &&
      !isNaN(Number(discount)) &&
      Number(discount) >= 0
        ? Number(discount)
        : undefined;
    if (disc !== undefined) data.discount = disc;
    if (discountPercent !== undefined && !isNaN(Number(discountPercent)))
      data.discountPercent = Number(discountPercent);
    const newTotal = subtotal + deliveryCharge - (disc ?? 0);
    data.total = newTotal;

    if (
      paidAmount !== undefined &&
      !isNaN(Number(paidAmount)) &&
      Number(paidAmount) >= 0
    ) {
      const paid = Number(paidAmount);
      data.paidAmount = paid;
      data.paymentStatus =
        paid <= 0 ? "unpaid" : paid >= newTotal ? "paid" : "partial";
    }

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });
    io.emit("order:updated", order);
    return res.json({ order });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addOrderItem = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { variantId, quantity, sealText } = req.body;

    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(variantId) },
      include: { product: true },
    });
    if (!variant) return res.status(400).json({ message: "Variant not found" });

    const qty = Number(quantity) || 1;
    const isSeal = variant.product.type === "seal";

    const [item] = await prisma.$transaction([
      prisma.orderItem.create({
        data: {
          orderId,
          variantId: variant.id,
          title: `${variant.product.title} — ${variant.title}`,
          price: variant.salePrice,
          quantity: qty,
          sealText: isSeal ? sealText || null : null,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          subtotal: { increment: variant.salePrice * qty },
          total: { increment: variant.salePrice * qty },
        },
      }),
    ]);

    return res.json({ item });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeOrderItem = async (req: Request, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const deduct = item.price * item.quantity;
    await prisma.$transaction([
      prisma.orderItem.delete({ where: { id: itemId } }),
      prisma.order.update({
        where: { id: item.orderId },
        data: { subtotal: { decrement: deduct }, total: { decrement: deduct } },
      }),
    ]);

    return res.json({ message: "Item removed" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderItemQuantity = async (req: Request, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const { quantity } = req.body;
    const qty = Number(quantity);
    if (!qty || qty < 1)
      return res.status(400).json({ message: "Invalid quantity" });

    const existing = await prisma.orderItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) return res.status(404).json({ message: "Item not found" });

    const diff = (qty - existing.quantity) * existing.price;
    const [item] = await prisma.$transaction([
      prisma.orderItem.update({
        where: { id: itemId },
        data: { quantity: qty },
      }),
      prisma.order.update({
        where: { id: existing.orderId },
        data: { subtotal: { increment: diff }, total: { increment: diff } },
      }),
    ]);

    return res.json({ item });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderItemVariant = async (req: Request, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const { variantId } = req.body;
    if (!variantId)
      return res.status(400).json({ message: "variantId required" });

    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(variantId) },
      include: { product: true },
    });
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const existing = await prisma.orderItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) return res.status(404).json({ message: "Item not found" });

    const priceDiff = (variant.salePrice - existing.price) * existing.quantity;
    const isSeal = variant.product.type === "seal";

    const [item] = await prisma.$transaction([
      prisma.orderItem.update({
        where: { id: itemId },
        data: {
          variantId: variant.id,
          title: `${variant.product.title} — ${variant.title}`,
          price: variant.salePrice,
          sealText: isSeal ? existing.sealText : null,
        },
      }),
      prisma.order.update({
        where: { id: existing.orderId },
        data: {
          subtotal: { increment: priceDiff },
          total: { increment: priceDiff },
        },
      }),
    ]);

    return res.json({ item });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderItemSealText = async (req: Request, res: Response) => {
  try {
    const itemId = Number(req.params.itemId);
    const { sealText } = req.body;
    const item = await prisma.orderItem.update({
      where: { id: itemId },
      data: { sealText: sealText ?? null },
    });
    return res.json({ item });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const moveOrderToTrash = async (req: Request, res: Response) => {
  try {
    await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { isTrashed: true },
    });
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

    await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { isTrashed: true },
    });
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

    await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { isTrashed: false },
    });
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
      return res
        .status(400)
        .json({ message: "ids array and status are required" });

    await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    io.emit("order:updated", { ids, status });
    return res.json({ message: `${ids.length} orders updated to "${status}"` });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderDiscount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { discount, discountPercent } = req.body;
    if (
      discount === undefined ||
      isNaN(Number(discount)) ||
      Number(discount) < 0
    )
      return res.status(400).json({ message: "Valid discount is required" });

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { subtotal: true, deliveryCharge: true },
    });
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const d = Number(discount);
    const dp =
      discountPercent !== undefined && !isNaN(Number(discountPercent))
        ? Number(discountPercent)
        : 0;
    const total = existing.subtotal + existing.deliveryCharge - d;

    const order = await prisma.order.update({
      where: { id },
      data: { discount: d, discountPercent: dp, total },
      include: { items: true },
    });
    io.emit("order:updated", order);
    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderPayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { paidAmount } = req.body;

    if (
      paidAmount === undefined ||
      isNaN(Number(paidAmount)) ||
      Number(paidAmount) < 0
    )
      return res.status(400).json({ message: "Valid paidAmount is required" });

    const paid = Number(paidAmount);

    // Fetch total to compute paymentStatus
    const existing = await prisma.order.findUnique({
      where: { id },
      select: { total: true },
    });
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
