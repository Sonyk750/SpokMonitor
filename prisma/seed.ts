import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const SITES = [
  { key: "spokapp", name: "SpokApp", domain: "spokapp.ro" },
  { key: "spokinvoice", name: "SpokInvoice", domain: "www.spokinvoice.ro" },
  { key: "spokadmin", name: "SpokAdmin", domain: "spokadmin.ro" },
  { key: "vosmart", name: "VoSmart", domain: "www.vosmart.ro" },
];

async function main() {
  for (const site of SITES) {
    await db.site.upsert({
      where: { key: site.key },
      update: { name: site.name, domain: site.domain },
      create: site,
    });
  }
  console.log(`Site-uri sincronizate: ${SITES.map(s => s.key).join(", ")}`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD nu sunt setate — sar peste crearea userului admin.");
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 12);
  await db.user.upsert({
    where: { email: adminEmail },
    update: { password: hashed },
    create: { email: adminEmail, password: hashed, name: "Admin" },
  });
  console.log(`User admin sincronizat: ${adminEmail}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
