import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("01700000000", 10);

  const admin = await prisma.user.upsert({
    where: { phone: "01700000000" },
    update: {},
    create: {
      name: "Admin",
      phone: "01700000000",
      password: hashedPassword,
      role: "admin",
    },
  });
  console.log("Admin created:", admin);

  // Seed employees with salary data
  const employees: { name: string; phone: string; role: Role; basicSalary: number; overtime: number; ta: number; bonus: number }[] = [
    { name: "Rahim Uddin",   phone: "01711111111", role: "manager",    basicSalary: 35000, overtime: 3000, ta: 2000, bonus: 5000 },
    { name: "Karim Hossain", phone: "01722222222", role: "designer",   basicSalary: 28000, overtime: 2000, ta: 1500, bonus: 3000 },
    { name: "Nasrin Akter",  phone: "01733333333", role: "support",    basicSalary: 22000, overtime: 1500, ta: 1000, bonus: 2000 },
    { name: "Jamal Mia",     phone: "01744444444", role: "production", basicSalary: 20000, overtime: 2500, ta: 1000, bonus: 2000 },
    { name: "Sohel Rana",    phone: "01755555555", role: "production", basicSalary: 20000, overtime: 2000, ta: 1000, bonus: 1500 },
  ];

  const empPassword = await bcrypt.hash("123456", 10);
  for (const emp of employees) {
    await prisma.user.upsert({
      where: { phone: emp.phone },
      update: { basicSalary: emp.basicSalary, overtime: emp.overtime, ta: emp.ta, bonus: emp.bonus },
      create: { ...emp, password: empPassword },
    });
  }
  console.log("5 employees seeded with salary data.");

  const sealProducts = [
    { title: "Round Seal", sizes: ["38mm", "45mm", "50mm"] },
    { title: "Square Seal", sizes: ["40mm", "50mm", "60mm"] },
    { title: "Oval Seal", sizes: ["50x30mm", "60x40mm", "70x50mm"] },
    { title: "Rectangle Seal", sizes: ["60x30mm", "70x40mm", "80x50mm"] },
    { title: "Flash Seal Round", sizes: ["38mm", "45mm", "50mm"] },
    { title: "Flash Seal Square", sizes: ["40mm", "50mm", "60mm"] },
    { title: "Flash Seal Oval", sizes: ["50x30mm", "60x40mm"] },
    { title: "Pre-Inked Round Seal", sizes: ["38mm", "45mm"] },
    { title: "Pre-Inked Square Seal", sizes: ["40mm", "50mm"] },
    { title: "Pocket Seal Round", sizes: ["38mm", "45mm", "50mm"] },
  ];
  const inkProducts = [
    "Black Ink 28ml", "Blue Ink 28ml", "Red Ink 28ml", "Green Ink 28ml",
    "Black Ink 50ml", "Blue Ink 50ml", "Red Ink 50ml",
    "Stamp Pad Black", "Stamp Pad Blue", "Stamp Pad Red",
  ];

  let sealSkuCounter = 1;
  for (const product of sealProducts) {
    const slug = product.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        title: product.title,
        slug,
        type: "seal",
        variants: {
          create: product.sizes.map((size, idx) => ({
            title: `${product.title} - ${size}`,
            size,
            sku: `SEAL-${String(sealSkuCounter++).padStart(3, "0")}`,
            regularPrice: 350 + idx * 50,
            salePrice: 300 + idx * 50,
            purchasePrice: 150 + idx * 25,
            stock: 50,
            isDefault: idx === 0,
            images: [],
          })),
        },
      },
    });
  }

  for (const [i, title] of inkProducts.entries()) {
    const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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

  console.log("20 products seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
