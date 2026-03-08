import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv();

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { code: "VIP_30_DAYS" },
    update: {
      name: "VIP 30 ngày",
      amount: 30000,
      durationDays: 30,
      isActive: true,
    },
    create: {
      code: "VIP_30_DAYS",
      name: "VIP 30 ngày",
      amount: 30000,
      durationDays: 30,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: "VIP_365_DAYS" },
    update: {
      name: "VIP 1 năm",
      amount: 300000,
      durationDays: 365,
      isActive: true,
    },
    create: {
      code: "VIP_365_DAYS",
      name: "VIP 1 năm",
      amount: 300000,
      durationDays: 365,
      isActive: true,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
