import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { invalidateWhatsAppCache } from "../../lib/whatsapp.service";

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
  try {
    const s = await getOrCreateSettings();
    const b = req.body;
    const data = {
      ...(b.siteTitle            !== undefined && { siteTitle: b.siteTitle }),
      ...(b.siteDescription      !== undefined && { siteDescription: b.siteDescription }),
      ...(b.logo                 !== undefined && { logo: b.logo }),
      ...(b.favicon              !== undefined && { favicon: b.favicon }),
      ...(b.email                !== undefined && { email: b.email }),
      ...(b.phone                !== undefined && { phone: b.phone }),
      ...(b.address              !== undefined && { address: b.address }),
      ...(b.supportEmail         !== undefined && { supportEmail: b.supportEmail }),
      ...(b.facebook             !== undefined && { facebook: b.facebook }),
      ...(b.instagram            !== undefined && { instagram: b.instagram }),
      ...(b.twitter              !== undefined && { twitter: b.twitter }),
      ...(b.linkedin             !== undefined && { linkedin: b.linkedin }),
      ...(b.youtube              !== undefined && { youtube: b.youtube }),
      ...(b.tiktok               !== undefined && { tiktok: b.tiktok }),
      ...(b.whatsapp             !== undefined && { whatsapp: b.whatsapp }),
      ...(b.telegram             !== undefined && { telegram: b.telegram }),
      ...(b.metaTitle            !== undefined && { metaTitle: b.metaTitle }),
      ...(b.metaDescription      !== undefined && { metaDescription: b.metaDescription }),
      ...(b.metaKeywords         !== undefined && { metaKeywords: b.metaKeywords }),
      ...(b.metaImage            !== undefined && { metaImage: b.metaImage }),
      ...(b.footerText           !== undefined && { footerText: b.footerText }),
      ...(b.deliveryFree         !== undefined && { deliveryFree: b.deliveryFree }),
      ...(b.deliveryInsideDhaka  !== undefined && { deliveryInsideDhaka: b.deliveryInsideDhaka }),
      ...(b.deliveryOutsideDhaka !== undefined && { deliveryOutsideDhaka: b.deliveryOutsideDhaka }),
      ...(b.fbPixelId            !== undefined && { fbPixelId: b.fbPixelId || null }),
      ...(b.fbAccessToken        !== undefined && { fbAccessToken: b.fbAccessToken || null }),
      ...(b.fbPixelEnabled       !== undefined && { fbPixelEnabled: b.fbPixelEnabled }),
      ...(b.googlePixelId        !== undefined && { googlePixelId: b.googlePixelId || null }),
      ...(b.googlePixelEnabled   !== undefined && { googlePixelEnabled: b.googlePixelEnabled }),
      ...(b.whatsappApiUrl       !== undefined && { whatsappApiUrl: b.whatsappApiUrl || null }),
      ...(b.whatsappApiToken     !== undefined && { whatsappApiToken: b.whatsappApiToken || null }),
      ...(b.whatsappEnabled      !== undefined && { whatsappEnabled: b.whatsappEnabled }),
    };
    const updated = await prisma.generalSettings.update({
      where: { id: s.id }, data,
      include: { banners: { orderBy: { order: "asc" } } },
    });
    invalidateWhatsAppCache();
    return res.json({ message: "Settings updated", settings: updated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function addBanner(req: Request, res: Response) {
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
  try {
    await prisma.banner.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
