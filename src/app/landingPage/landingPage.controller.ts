import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import {
  createLandingPageSchema,
  updateLandingPageSchema,
} from "./landingPage.validation";

const landingPageInclude = {
  products: {
    orderBy: { displayOrder: "asc" as const },
    include: {
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
    },
  },
};

export async function getLandingPages(_req: Request, res: Response) {
  try {
    const pages = await prisma.landingPage.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        products: {
          select: {
            id: true,
            productId: true,
            displayOrder: true,
          },
        },
      },
    });
    return res.json({ pages });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getLandingPageBySlug(req: Request, res: Response) {
  try {
    const [page, freeGiftProduct] = await Promise.all([
      prisma.landingPage.findUnique({
        where: { slug: req.params.slug },
        include: landingPageInclude,
      }),
      prisma.product.findFirst({
        where: { isFreeGift: true, isTrashed: false },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { isDefault: "desc" as const },
            select: { id: true, title: true, color: true, size: true, regularPrice: true, salePrice: true, stock: true, images: true, isDefault: true, isActive: true },
          },
        },
      }),
    ]);
    if (!page || !page.isActive)
      return res.status(404).json({ message: "Landing page not found" });
    return res.json({ page: { ...page, freeGiftProduct: freeGiftProduct ?? null } });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function getLandingPageById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const page = await prisma.landingPage.findUnique({
      where: { id },
      include: landingPageInclude,
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

    const { products, ...pageData } = parsed.data;

    const slugExists = await prisma.landingPage.findUnique({
      where: { slug: pageData.slug },
    });
    if (slugExists)
      return res.status(409).json({ message: "Slug already exists" });

    const page = await prisma.landingPage.create({
      data: {
        ...pageData,
        products: {
          create: products.map(({ id: _id, ...p }) => p),
        },
      },
      include: landingPageInclude,
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

    const { products, ...pageData } = parsed.data;

    const slugExists = await prisma.landingPage.findFirst({
      where: { slug: pageData.slug, NOT: { id } },
    });
    if (slugExists)
      return res.status(409).json({ message: "Slug already exists" });

    const page = await prisma.$transaction(async (tx) => {
      await tx.landingPage.update({ where: { id }, data: pageData });

      // Sync products: delete removed, upsert existing/new
      const incoming = products;
      const incomingWithId = incoming.filter((p) => p.id);
      const incomingIds = incomingWithId.map((p) => p.id!);

      await tx.landingPageProduct.deleteMany({
        where: { landingPageId: id, id: { notIn: incomingIds } },
      });

      for (const p of incoming) {
        if (p.id) {
          const { id: pid, productId: _pid, ...rest } = p;
          await tx.landingPageProduct.update({
            where: { id: pid },
            data: rest,
          });
        } else {
          const { id: _id, ...rest } = p;
          await tx.landingPageProduct.create({
            data: { ...rest, landingPageId: id },
          });
        }
      }

      return tx.landingPage.findUniqueOrThrow({
        where: { id },
        include: landingPageInclude,
      });
    });

    return res.json({ message: "Landing page updated", page });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deleteLandingPage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await prisma.landingPage.delete({ where: { id } });
    return res.json({ message: "Landing page deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
