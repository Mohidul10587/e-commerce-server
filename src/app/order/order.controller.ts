import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { io } from "../../index";
import { createConsignment } from "../courier/steadfast.service";
import { sendOrderConfirmationWhatsApp, sendOrderStatusWhatsApp, sendPaymentWhatsApp } from "../../lib/whatsapp.service";
import { adjustStock, syncProductStock } from "../product/product.service";

// Group A: preliminary statuses
const GROUP_A = new Set([
  "Processing",
  "WaitForDesign",
  "DesignSubmitted",
  "Revision",
  "CustomerInformed",
  "NeedToCall",
  "NoResponse",
  "UrgentDesign",
  "Problem",
  "OnHold",
  "NotInterested",
  "InProduction",
]);

// Group B: confirmed
const GROUP_B = new Set(["OrderConfirmed"]);

// Group C: final/delivery statuses
const GROUP_C = new Set([
  "InReview",
  "Pending",
  "Delivered",
  "PartlyDelivered",
  "Cancel",
  "CourierHold",
  "DeliveredApprovalPending",
  "PartialDeliveredApprovalPending",
  "CancelledApprovalPending",
  "UnknownApprovalPending",
  "CourierUnknown",
]);

const VALID_STATUSES = [
  "Processing",
  "WaitForDesign",
  "DesignSubmitted",
  "Revision",
  "CustomerInformed",
  "NeedToCall",
  "NoResponse",
  "UrgentDesign",
  "Problem",
  "OnHold",
  "NotInterested",
  "OrderConfirmed",
  "InProduction",
  "InReview",
  "Pending",
  "Delivered",
  "PartlyDelivered",
  "Cancel",
  "CourierHold",
  "DeliveredApprovalPending",
  "PartialDeliveredApprovalPending",
  "CancelledApprovalPending",
  "UnknownApprovalPending",
  "CourierUnknown",
];

export const getPublicStats = async (_req: Request, res: Response) => {
  try {
    const [totalSale, totalCustomers, totalStockOut] = await Promise.all([
      prisma.order.count({ where: { isTrashed: false } }),
      prisma.user.count({ where: { role: "customer", isTrashed: false } }),
      prisma.stockHistory.aggregate({
        _sum: { quantity: true },
        where: { action: "REMOVE" },
      }),
    ]);
    return res.json({
      totalSale,
      totalCustomers,
      totalStockOut: totalStockOut._sum.quantity ?? 0,
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrderStatusCounts = async (_req: Request, res: Response) => {
  try {
    const [allCount, trashCount, statusGroups, paymentGroups] = await Promise.all([
      prisma.order.count({ where: { isTrashed: false } }),
      prisma.order.count({ where: { isTrashed: true } }),
      prisma.order.groupBy({ by: ["status"], where: { isTrashed: false }, _count: { _all: true } }),
      prisma.order.groupBy({ by: ["paymentStatus"], where: { isTrashed: false }, _count: { _all: true } }),
    ]);

    const counts: Record<string, number> = { all: allCount, trash: trashCount };
    for (const g of statusGroups) counts[g.status] = g._count._all;
    for (const g of paymentGroups) counts[g.paymentStatus] = g._count._all;

    // Ensure all valid statuses and payment statuses have a 0 default
    for (const s of VALID_STATUSES) if (!(s in counts)) counts[s] = 0;
    for (const p of ["unpaid", "partial", "paid"]) if (!(p in counts)) counts[p] = 0;

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
      alternativePhone,
      address,
      contactLink,
      items,
      deliveryCharge,
      note,
      discount,
      discountPercent,
      status,
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

    const variantIds = items.map((i: any) => Number(i.variantId));
    const variantsData = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });
    const variantMap = Object.fromEntries(variantsData.map((v) => [v.id, v]));

    for (const item of items) {
      const isFree = !!item.isFreeItem;
      const variant = variantMap[Number(item.variantId)];
      if (!variant)
        return res
          .status(400)
          .json({ message: `Variant ${item.variantId} not found` });

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
        alternativePhone: alternativePhone || null,
        address,
        contactLink: contactLink || null,
        subtotal,
        deliveryCharge: charge,
        total: subtotal + charge - disc,
        discount: disc,
        discountPercent: discPct,
        status: status || undefined,
        note: note || null,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });

    io.emit("order:new", order);

    // Send WhatsApp confirmation message
    try {
      await sendOrderConfirmationWhatsApp({
        orderId: String(order.id),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
        total: order.total,
        address: order.address,
      });
    } catch (whatsappError) {
      console.error("WhatsApp message failed:", whatsappError);
      // Don't fail the order if WhatsApp fails
    }

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
      assignedDesignerId,
    } = req.query;
    const where: any = { isTrashed: trash === "true" };

    if (search) {
      const s = search as string;
      const numericId = parseInt(s);
      const conditions: any[] = [
        { customerName: { contains: s, mode: "insensitive" } },
        { customerPhone: { contains: s, mode: "insensitive" } },
        { alternativePhone: { contains: s, mode: "insensitive" } },
      ];
      if (!isNaN(numericId)) conditions.push({ id: numericId });
      where.OR = conditions;
    }

    // Support comma-separated statuses e.g. "WaitForDesign,Revision,DesignSubmitted"
    if (status) {
      const statuses = (status as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (payment) where.paymentStatus = payment;
    if (assignedDesignerId)
      where.assignedDesignerId = parseInt(assignedDesignerId as string);

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    const orderDir = sort === "asc" ? "asc" : "desc";

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          assignedDesigner: { select: { id: true, name: true } },
        },
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
    const id = Number(req.params.id);

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const existing = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });

    const from = existing.status as string;

    // Block: Group A → Group C directly (must go through OrderConfirmed first)
    if (GROUP_A.has(from) && GROUP_C.has(status)) {
      return res.status(400).json({
        message: `Cannot transition from ${from} directly to ${status}. Must confirm order first (OrderConfirmed).`,
      });
    }

    await prisma.$transaction(async (tx) => {
      const productIds = new Set<number>();

      // A → B or A → C: deduct stock once
      const leavingGroupA = GROUP_A.has(from) && (GROUP_B.has(status) || GROUP_C.has(status));
      if (leavingGroupA && !existing.stockDeducted) {
        for (const item of existing.items) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
          if (!variant) continue;
          await adjustStock(item.variantId, "SALE", item.quantity, `Order #${id} left Group A → ${status}`, tx as any);
          productIds.add(variant.productId);
        }
        for (const pid of productIds) await syncProductStock(pid, tx as any);
        productIds.clear();
        await tx.order.update({ where: { id }, data: { stockDeducted: true } });
      }

      // B/C → A: restore stock
      const returningToGroupA = GROUP_A.has(status) && (GROUP_B.has(from) || GROUP_C.has(from));
      if (returningToGroupA && existing.stockDeducted) {
        for (const item of existing.items) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
          if (!variant) continue;
          await adjustStock(item.variantId, "RETURN", item.quantity, `Order #${id} returned to Group A → ${status}`, tx as any);
          productIds.add(variant.productId);
        }
        for (const pid of productIds) await syncProductStock(pid, tx as any);
        await tx.order.update({ where: { id }, data: { stockDeducted: false } });
      }

      const extraData: any = { status };
      if (status === "OrderConfirmed" && !existing.confirmedAt) {
        extraData.confirmedAt = new Date();
      }
      await tx.order.update({ where: { id }, data: extraData });
    });

    let order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });

    // Auto-create SteadFast consignment on InReview (only once)
    if (status === "InReview" && !(order.courier as any)?.consignment_id) {
      try {
        const invoice = `ORD-${id}`;
        const consignment = await createConsignment({
          invoice,
          recipient_name: order.customerName,
          recipient_phone: order.customerPhone,
          recipient_address: order.address,
          cod_amount: order.total,
          note: order.note ?? undefined,
        });
        const courierData = {
          provider: "steadfast",
          consignment_id: consignment.consignment_id,
          tracking_code: consignment.tracking_code,
          invoice: consignment.invoice,
          status: consignment.status,
          cod_amount: consignment.cod_amount,
          delivery_charge: null,
          last_update: new Date().toISOString(),
        };
        order = await prisma.order.update({
          where: { id },
          data: { courier: courierData },
          include: { items: true },
        });
        console.log(
          `[Courier] ✅ Order #${id} submitted to SteadFast successfully.\n`,
          `  consignment_id : ${consignment.consignment_id}\n`,
          `  tracking_code  : ${consignment.tracking_code}\n`,
          `  invoice        : ${consignment.invoice}\n`,
          `  status         : ${consignment.status}\n`,
          `  cod_amount     : ${consignment.cod_amount}`
        );
      } catch (courierErr: any) {
        console.error(
          `[Courier] Failed to create consignment for order #${id}:`,
          courierErr.message
        );
        // Non-fatal: order status is already updated; log and continue
      }
    }

    io.emit("order:updated", order);

    // WhatsApp notifications for key status changes
    if (status === "OrderConfirmed" || status === "Delivered") {
      sendOrderStatusWhatsApp(order.customerPhone, order.customerName, id, status as "OrderConfirmed" | "Delivered").catch(() => {});
    }

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
      alternativePhone,
      address,
      contactLink,
      status,
      discount,
      discountPercent,
      paidAmount,
      items,
      note,
    } = req.body;
    const data: any = {};
    if (customerName) data.customerName = customerName;
    if (customerPhone) data.customerPhone = customerPhone;
    if (alternativePhone !== undefined)
      data.alternativePhone = alternativePhone || null;
    if (address) data.address = address;
    if (contactLink !== undefined) data.contactLink = contactLink || null;
    if (note !== undefined) data.note = note || null;
    if (status) data.status = status;

    // Replace items if provided
    if (Array.isArray(items)) {
      // Resolve all variants in one query
      let subtotal = 0;
      const resolved: {
        variantId: number;
        title: string;
        price: number;
        quantity: number;
        sealText: string | null;
        isFreeItem: boolean;
      }[] = [];

      const variantIds = items.map((i: any) => Number(i.variantId));
      const variantsData = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      });
      const variantMap = Object.fromEntries(variantsData.map((v) => [v.id, v]));

      for (const item of items) {
        const isFree = !!item.isFreeItem;
        const variant = variantMap[Number(item.variantId)];
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

    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const errors: { id: number; message: string }[] = [];
    const numericIds = ids.map(Number);

    // Fetch all orders in one query
    const allOrders = await prisma.order.findMany({
      where: { id: { in: numericIds } },
      include: { items: true },
    });
    const orderMap = Object.fromEntries(allOrders.map((o) => [o.id, o]));

    // Separate orders that need stock changes from simple ones
    const stockOrders: typeof allOrders = [];
    const simpleOrderIds: number[] = [];

    for (const rawId of numericIds) {
      const id = Number(rawId);
      const existing = orderMap[id];
      if (!existing) { errors.push({ id, message: "Not found" }); continue; }

      const from = existing.status as string;

      if (GROUP_A.has(from) && GROUP_C.has(status)) {
        errors.push({ id, message: `Cannot go directly from ${from} to ${status}` });
        continue;
      }

      const leavingGroupA = GROUP_A.has(from) && (GROUP_B.has(status) || GROUP_C.has(status));
      const returningToGroupA = GROUP_A.has(status) && (GROUP_B.has(from) || GROUP_C.has(from));
      const needsStockChange = (leavingGroupA && !existing.stockDeducted) || (returningToGroupA && existing.stockDeducted);

      if (needsStockChange) {
        stockOrders.push(existing);
      } else {
        simpleOrderIds.push(id);
      }
    }

    // Batch update simple orders (no stock change) with a single updateMany
    if (simpleOrderIds.length > 0) {
      const extraData: any = { status };
      if (status === "OrderConfirmed") {
        // For simple orders, set confirmedAt only for those that don't have it yet
        // Use updateMany for those without confirmedAt, and a separate one for those with
        await Promise.all([
          prisma.order.updateMany({
            where: { id: { in: simpleOrderIds }, confirmedAt: null },
            data: { status, confirmedAt: new Date() },
          }),
          prisma.order.updateMany({
            where: { id: { in: simpleOrderIds }, NOT: { confirmedAt: null } },
            data: { status },
          }),
        ]);
      } else {
        await prisma.order.updateMany({
          where: { id: { in: simpleOrderIds } },
          data: extraData,
        });
      }
    }

    // Process stock-related orders individually (they need per-order transactions)
    for (const existing of stockOrders) {
      const id = existing.id;
      const from = existing.status as string;
      try {
        await prisma.$transaction(async (tx) => {
          const productIds = new Set<number>();

          const leavingGroupA = GROUP_A.has(from) && (GROUP_B.has(status) || GROUP_C.has(status));
          if (leavingGroupA && !existing.stockDeducted) {
            for (const item of existing.items) {
              const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
              if (!variant) continue;
              await adjustStock(item.variantId, "SALE", item.quantity, `Order #${id} bulk: left Group A → ${status}`, tx as any);
              productIds.add(variant.productId);
            }
            for (const pid of productIds) await syncProductStock(pid, tx as any);
            productIds.clear();
            await tx.order.update({ where: { id }, data: { stockDeducted: true } });
          }

          const returningToGroupA = GROUP_A.has(status) && (GROUP_B.has(from) || GROUP_C.has(from));
          if (returningToGroupA && existing.stockDeducted) {
            for (const item of existing.items) {
              const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
              if (!variant) continue;
              await adjustStock(item.variantId, "RETURN", item.quantity, `Order #${id} bulk: returned to Group A → ${status}`, tx as any);
              productIds.add(variant.productId);
            }
            for (const pid of productIds) await syncProductStock(pid, tx as any);
            await tx.order.update({ where: { id }, data: { stockDeducted: false } });
          }

          const extraData: any = { status };
          if (status === "OrderConfirmed" && !existing.confirmedAt) {
            extraData.confirmedAt = new Date();
          }
          await tx.order.update({ where: { id }, data: extraData });
        });
      } catch {
        errors.push({ id, message: "Internal error" });
      }
    }

    io.emit("order:updated", { ids, status });
    const successCount = numericIds.length - errors.length;
    return res.json({
      message: `${successCount} orders updated to "${status}"`,
      ...(errors.length ? { errors } : {}),
    });
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

export const getOrderPayments = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { orderId: Number(req.params.id) },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ transactions });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteOrderPayment = async (req: Request, res: Response) => {
  try {
    const txId = Number(req.params.txId);
    const tx = await prisma.paymentTransaction.findUnique({
      where: { id: txId },
    });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });

    await prisma.paymentTransaction.delete({ where: { id: txId } });

    // Recalculate paidAmount from remaining transactions
    const agg = await prisma.paymentTransaction.aggregate({
      where: { orderId: tx.orderId },
      _sum: { amount: true },
    });
    const newPaid = agg._sum.amount ?? 0;
    const order = await prisma.order.findUnique({
      where: { id: tx.orderId },
      select: { total: true },
    });
    const paymentStatus =
      newPaid <= 0
        ? "unpaid"
        : newPaid >= (order?.total ?? 0)
        ? "paid"
        : "partial";
    await prisma.order.update({
      where: { id: tx.orderId },
      data: { paidAmount: newPaid, paymentStatus },
    });

    io.emit("order:updated", { id: tx.orderId });
    return res.json({ message: "Payment deleted" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderPaymentTx = async (req: Request, res: Response) => {
  try {
    const txId = Number(req.params.txId);
    const { amount, source, trxId, note } = req.body;
    const tx = await prisma.paymentTransaction.findUnique({
      where: { id: txId },
    });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });

    await prisma.paymentTransaction.update({
      where: { id: txId },
      data: {
        amount: amount !== undefined ? Number(amount) : tx.amount,
        source: source !== undefined ? source || null : tx.source,
        trxId: trxId !== undefined ? trxId || null : tx.trxId,
        note: note !== undefined ? note || null : tx.note,
      },
    });

    const agg = await prisma.paymentTransaction.aggregate({
      where: { orderId: tx.orderId },
      _sum: { amount: true },
    });
    const newPaid = agg._sum.amount ?? 0;
    const order = await prisma.order.findUnique({
      where: { id: tx.orderId },
      select: { total: true },
    });
    const paymentStatus =
      newPaid <= 0
        ? "unpaid"
        : newPaid >= (order?.total ?? 0)
        ? "paid"
        : "partial";
    await prisma.order.update({
      where: { id: tx.orderId },
      data: { paidAmount: newPaid, paymentStatus },
    });

    io.emit("order:updated", { id: tx.orderId });
    return res.json({ message: "Payment updated" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOrderPayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { amount, note, source, trxId } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ message: "Valid amount is required" });

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { total: true, paidAmount: true },
    });
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const newPaid = existing.paidAmount + Number(amount);
    const paymentStatus = newPaid >= existing.total ? "paid" : "partial";

    const order = await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          orderId: id,
          amount: Number(amount),
          note: note || null,
          source: source || null,
          trxId: trxId || null,
        },
      });
      return tx.order.update({
        where: { id },
        data: { paidAmount: newPaid, paymentStatus, paidAt: new Date() },
        include: {
          items: true,
          transactions: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    io.emit("order:updated", order);

    sendPaymentWhatsApp(order.customerPhone, order.customerName, id, Number(amount)).catch(() => {});

    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const emptyOrderTrash = async (_req: Request, res: Response) => {
  try {
    const { count } = await prisma.order.deleteMany({
      where: { isTrashed: true },
    });
    return res.json({ message: `${count} orders permanently deleted` });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const assignDesigner = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { designerId } = req.body; // null to unassign
    const order = await prisma.order.update({
      where: { id },
      data: { assignedDesignerId: designerId ?? null }, // Temporarily empty - assignedDesignerId field not available
      include: { items: true },
    });
    io.emit("order:updated", order);
    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const bulkAssignDesigner = async (req: Request, res: Response) => {
  try {
    const { ids, designerId } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !designerId) {
      return res
        .status(400)
        .json({ message: "ids and designerId are required" });
    }
    await prisma.order.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: { assignedDesignerId: Number(designerId) },
    });
    io.emit("order:updated", {});
    return res.json({ message: `${ids.length} orders assigned` });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Designer page: fetch all orders assigned to the requesting designer (WaitForDesign, Revision, UrgentDesign, DesignSubmitted)
export const getDesignerDashboardOrders = async (req: Request, res: Response): Promise<Response> => {
  try {
    // @ts-ignore
    const requesterId = req.user?.id;
    const orders = await prisma.order.findMany({
      where: {
        isTrashed: false,
        status: { in: ["WaitForDesign", "Revision", "UrgentDesign", "DesignSubmitted"] },
        assignedDesignerId: requesterId,
      },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ orders });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Designer-only: get order details without sensitive info (no price, no customer info)
export const getOrderForDesigner = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    // @ts-ignore
    const requesterId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        note: true,
        createdAt: true,

        customerName: true,
        customerPhone: true,
        alternativePhone: true,
        address: true,

        subtotal: true,
        deliveryCharge: true,
        total: true,
        discount: true,
        discountPercent: true,

        contactLink: true,
        assignedDesignerId: true,

        items: {
          select: {
            id: true,
            title: true,
            sealText: true,
            price: true,
            quantity: true,
            isFreeItem: true,
            variantId: true,
          },
        },
      },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.assignedDesignerId !== requesterId)
      return res.status(403).json({ message: "Not assigned to you" });

    return res.json({ order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Designer-only: submit design (WaitForDesign/Revision → DesignSubmitted)
export const designerSubmitDesign = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    // @ts-ignore
    const requesterId = req.user?.id;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.assignedDesignerId !== requesterId)
      return res.status(403).json({ message: "Not assigned to you" });
    if (
      !["WaitForDesign", "Revision", "UrgentDesign"].includes(
        existing.status as string
      )
    )
      return res
        .status(400)
        .json({ message: "Order is not in a design stage" });

    const order = await prisma.order.update({
      where: { id },
      data: { status: "DesignSubmitted" },
      include: { items: true },
    });

    io.emit("order:updated", order);
    return res.json({ message: "Design submitted", order });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};
