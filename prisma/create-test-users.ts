import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const users = [
  { name: "Manager",    phone: "01811111111", role: "manager"    },
  { name: "Designer",   phone: "01822222222", role: "designer"   },
  { name: "Production", phone: "01833333333", role: "production" },
  { name: "Support",    phone: "01844444444", role: "support"    },
] as const;

async function main() {
  for (const u of users) {
    const hashed = await bcrypt.hash(u.phone, 10);
    const created = await prisma.user.upsert({
      where: { phone: u.phone },
      update: { name: u.name, role: u.role, password: hashed },
      create: { name: u.name, phone: u.phone, password: hashed, role: u.role },
    });
    console.log(`✅ ${u.role.padEnd(10)} | phone: ${u.phone} | password: ${u.phone} | id: ${created.id}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
