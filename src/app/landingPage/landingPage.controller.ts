import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import {
  createLandingPageSchema,
  updateLandingPageSchema,
} from "./landingPage.validation";

const productInclude = {
  product: {
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { isDefault: "desc" as const },
        select: {
          id: true,
          title: true,
          size: true,
          color: true,
          regularPrice: true,
          salePrice: true,
          stock: true,
          images: true,
          isDefault: true,
          isActive: true,
        },
      },
    },
  },
};

export async function getLandingPages(_req: Request, res: Response) {
  try {
    const pages = await prisma.landingPage.findMany({
      where: { isTrashed: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        isActive: true,
        isTrashed: true,
        productId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json({ pages });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getTrashedLandingPages(_req: Request, res: Response) {
  try {
    const pages = await prisma.landingPage.findMany({
      where: { isTrashed: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        isActive: true,
        isTrashed: true,
        productId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json({ pages });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getLandingPageBySlug(req: Request, res: Response) {
  try {
    const page = await prisma.landingPage.findUnique({
      where: { slug: req.params.slug },
      include: productInclude,
    });
    if (!page || !page.isActive || page.isTrashed)
      return res.status(404).json({ message: "Landing page not found" });

    const extraInkIds: number[] = page.extraInkProductIds ?? [];

    const [freeGiftProduct, extraInkProducts] = await Promise.all([
      prisma.product.findFirst({
        where: { isFreeGift: true, isTrashed: false },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { isDefault: "desc" as const },
            select: {
              id: true,
              title: true,
              color: true,
              size: true,
              regularPrice: true,
              salePrice: true,
              stock: true,
              images: true,
              isDefault: true,
              isActive: true,
            },
          },
        },
      }),
      extraInkIds.length > 0
        ? prisma.product.findMany({
            where: { id: { in: extraInkIds }, isTrashed: false },
            include: {
              variants: {
                where: { isActive: true },
                orderBy: { isDefault: "desc" as const },
                select: {
                  id: true,
                  title: true,
                  color: true,
                  size: true,
                  regularPrice: true,
                  salePrice: true,
                  stock: true,
                  images: true,
                  isDefault: true,
                  isActive: true,
                },
              },
            },
          })
        : prisma.product.findMany({
            where: { type: "ink", isTrashed: false },
            include: {
              variants: {
                where: { isActive: true },
                orderBy: { isDefault: "desc" as const },
                select: {
                  id: true,
                  title: true,
                  color: true,
                  size: true,
                  regularPrice: true,
                  salePrice: true,
                  stock: true,
                  images: true,
                  isDefault: true,
                  isActive: true,
                },
              },
            },
          }),
    ]);

    return res.json({
      page: {
        ...page,
        freeGiftProduct: freeGiftProduct ?? null,
        extraInkProducts,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getLandingPageById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const page = await prisma.landingPage.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!page)
      return res.status(404).json({ message: "Landing page not found" });
    return res.json({ page });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function createLandingPage(req: Request, res: Response) {
  try {
    const parsed = createLandingPageSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Validation error", errors: parsed.error.flatten() });

    const { productId, selectedVariantIds, ...pageData } = parsed.data;

    const slugExists = await prisma.landingPage.findUnique({
      where: { slug: pageData.slug },
    });
    if (slugExists)
      return res.status(409).json({ message: "Slug already exists" });

    const page = await prisma.landingPage.create({
      data: {
        ...pageData,
        productId: productId ?? null,
        selectedVariantIds: selectedVariantIds ?? [],
      },
      include: productInclude,
    });
    return res.status(201).json({ message: "Landing page created", page });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateLandingPage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateLandingPageSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Validation error", errors: parsed.error.flatten() });

    const { productId, selectedVariantIds, ...pageData } = parsed.data;

    const slugExists = await prisma.landingPage.findFirst({
      where: { slug: pageData.slug, NOT: { id } },
    });
    if (slugExists)
      return res.status(409).json({ message: "Slug already exists" });

    const page = await prisma.landingPage.update({
      where: { id },
      data: {
        ...pageData,
        productId: productId ?? null,
        selectedVariantIds: selectedVariantIds ?? [],
      },
      include: productInclude,
    });

    return res.json({ message: "Landing page updated", page });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function trashLandingPage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const page = await prisma.landingPage.findUnique({ where: { id } });
    if (!page)
      return res.status(404).json({ message: "Landing page not found" });

    await prisma.landingPage.update({
      where: { id },
      data: { isTrashed: true, isActive: false },
    });
    return res.json({ message: "Landing page moved to trash" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function restoreLandingPage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const page = await prisma.landingPage.findUnique({ where: { id } });
    if (!page)
      return res.status(404).json({ message: "Landing page not found" });

    await prisma.landingPage.update({
      where: { id },
      data: { isTrashed: false },
    });
    return res.json({ message: "Landing page restored" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function emptyTrash(_req: Request, res: Response) {
  try {
    const { count } = await prisma.landingPage.deleteMany({
      where: { isTrashed: true },
    });
    return res.json({
      message: `${count} landing page(s) permanently deleted`,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deleteLandingPage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const page = await prisma.landingPage.findUnique({ where: { id } });
    if (!page)
      return res.status(404).json({ message: "Landing page not found" });
    if (!page.isTrashed)
      return res
        .status(400)
        .json({ message: "Move to trash first before permanent delete" });

    await prisma.landingPage.delete({ where: { id } });
    return res.json({ message: "Landing page permanently deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
