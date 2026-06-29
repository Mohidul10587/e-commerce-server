import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Admin
  await prisma.user.upsert({
    where: { phone: "01700000000" },
    update: {},
    create: {
      name: "Admin",
      phone: "01700000000",
      password: await bcrypt.hash("01700000000", 10),
      role: "admin",
    },
  });
  console.log("Admin created: phone=01700000000 password=01700000000");

  // Seal products
  const seals = [
    { title: "Round Seal", sizes: ["38mm", "45mm", "50mm"] },
    { title: "Square Seal", sizes: ["40mm", "50mm", "60mm"] },
    { title: "Oval Seal", sizes: ["50x30mm", "60x40mm"] },
  ];

  let skuN = 1;
  for (const s of seals) {
    const slug = s.title.toLowerCase().replace(/\s+/g, "-");
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        title: s.title,
        slug,
        type: "seal",
        variants: {
          create: s.sizes.map((size, i) => ({
            title: `${s.title} ${size}`,
            size,
            sku: `SEAL-${String(skuN++).padStart(3, "0")}`,
            regularPrice: 350 + i * 50,
            salePrice: 300 + i * 50,
            purchasePrice: 150,
            stock: 50,
            isDefault: i === 0,
            images: [],
          })),
        },
      },
    });
  }
  console.log("3 seal products created");

  // Ink products
  const inks = ["Black Ink 28ml", "Blue Ink 28ml", "Red Ink 28ml"];
  for (const [i, title] of inks.entries()) {
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        title,
        slug,
        type: "ink",
        variants: {
          create: {
            title: `${title} - Default`,
            sku: `INK-${String(i + 1).padStart(3, "0")}`,
            regularPrice: 150,
            salePrice: 120,
            purchasePrice: 60,
            stock: 100,
            isDefault: true,
            images: [],
          },
        },
      },
    });
  }
  console.log("3 ink products created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
