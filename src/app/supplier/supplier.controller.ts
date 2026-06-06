import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function getSuppliers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const trash = req.query.trash === "true";

    const where = {
      isTrashed: trash,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    return res.json({ suppliers, total });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function createSupplier(req: Request, res: Response) {
  try {
    const { name, address, phone, website, facebook } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const supplier = await prisma.supplier.create({
      data: { name, address, phone, website, facebook },
    });
    return res.status(201).json({ supplier });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateSupplier(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { name, address, phone, website, facebook } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, address, phone, website, facebook },
    });
    return res.json({ supplier });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function trashSupplier(req: Request, res: Response) {
  try {
    await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: { isTrashed: true },
    });
    return res.json({ message: "Moved to trash" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function restoreSupplier(req: Request, res: Response) {
  try {
    await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: { isTrashed: false },
    });
    return res.json({ message: "Restored" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deleteSupplier(req: Request, res: Response) {
  try {
    await prisma.supplier.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
