import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv();

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { code: "VIP_30_DAYS" },
    update: {
      name: "39.000đ tặng VIP 31 ngày",
      amount: 39000,
      durationDays: 31,
      isActive: true,
    },
    create: {
      code: "VIP_30_DAYS",
      name: "39.000đ tặng VIP 31 ngày",
      amount: 39000,
      durationDays: 31,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: "VIP_90_DAYS" },
    update: {
      name: "99.000đ tặng VIP 90 ngày",
      amount: 99000,
      durationDays: 90,
      isActive: true,
    },
    create: {
      code: "VIP_90_DAYS",
      name: "99.000đ tặng VIP 90 ngày",
      amount: 99000,
      durationDays: 90,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: "VIP_365_DAYS" },
    update: {
      name: "199.000đ tặng VIP 365 ngày",
      amount: 199000,
      durationDays: 365,
      isActive: true,
    },
    create: {
      code: "VIP_365_DAYS",
      name: "199.000đ tặng VIP 365 ngày",
      amount: 199000,
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
