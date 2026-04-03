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

  const channel = await prisma.cinemaChannel.upsert({
    where: { slug: "vip-demo-channel" },
    update: {
      displayName: "VIP Demo Channel",
      isEnabled: true,
    },
    create: {
      platform: "TELEGRAM",
      sourceChannelId: "-1000000000000",
      role: "FULL_SOURCE",
      displayName: "VIP Demo Channel",
      slug: "vip-demo-channel",
      isEnabled: true,
    },
  });

  const item = await prisma.cinemaItem.upsert({
    where: {
      channelId_sourceMessageId: {
        channelId: channel.id,
        sourceMessageId: "seed-demo-1",
      },
    },
    update: {
      title: "Demo VIP Film",
      description: "Sample seeded item for cinema web integration.",
    },
    create: {
      channelId: channel.id,
      sourceMessageId: "seed-demo-1",
      title: "Demo VIP Film",
      description: "Sample seeded item for cinema web integration.",
      durationSeconds: 120,
    },
  });

  await prisma.cinemaAsset.upsert({
    where: {
      itemId_kind: {
        itemId: item.id,
        kind: "PREVIEW",
      },
    },
    update: {
      provider: "seed",
      fileRef: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      mimeType: "video/mp4",
    },
    create: {
      itemId: item.id,
      kind: "PREVIEW",
      provider: "seed",
      fileRef: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      mimeType: "video/mp4",
    },
  });

  await prisma.cinemaAsset.upsert({
    where: {
      itemId_kind: {
        itemId: item.id,
        kind: "FULL",
      },
    },
    update: {
      provider: "seed",
      fileRef: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      mimeType: "video/mp4",
    },
    create: {
      itemId: item.id,
      kind: "FULL",
      provider: "seed",
      fileRef: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      mimeType: "video/mp4",
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
