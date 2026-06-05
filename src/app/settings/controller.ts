import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

function requireAdmin(req: Request, res: Response): boolean {
  try {
    const token = req.cookies.token;
    if (!token) { res.status(401).json({ message: "Unauthorized" }); return false; }
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== "admin") { res.status(403).json({ message: "Admin only" }); return false; }
    return true;
  } catch {
    res.status(401).json({ message: "Token expired" });
    return false;
  }
}

async function getOrCreateSettings() {
  let s = await prisma.generalSettings.findFirst({ include: { banners: { orderBy: { order: "asc" } } } });
  if (!s) s = await prisma.generalSettings.create({ data: {}, include: { banners: { orderBy: { order: "asc" } } } });
  return s;
}

export async function getSettings(_req: Request, res: Response) {
  try {
    return res.json({ settings: await getOrCreateSettings() });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateSettings(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const s = await getOrCreateSettings();
    const { banners: _, ...data } = req.body; // banners managed separately
    const updated = await prisma.generalSettings.update({
      where: { id: s.id }, data,
      include: { banners: { orderBy: { order: "asc" } } },
    });
    return res.json({ message: "Settings updated", settings: updated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function addBanner(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const s = await getOrCreateSettings();
    const { desktopImage, mobileImage, link } = req.body;
    if (!desktopImage || !mobileImage) return res.status(400).json({ message: "Both images required" });
    const count = await prisma.banner.count({ where: { settingsId: s.id } });
    const banner = await prisma.banner.create({ data: { desktopImage, mobileImage, link, order: count, settingsId: s.id } });
    return res.status(201).json({ banner });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deleteBanner(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    await prisma.banner.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
