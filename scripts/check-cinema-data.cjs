const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const channels = await p.cinemaChannel.findMany({
    select: {
      id: true, slug: true, displayName: true, role: true, isEnabled: true,
      _count: { select: { items: true } }
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
  const itemCount = await p.cinemaItem.count();
  const assetCount = await p.cinemaAsset.count();
  const sample = await p.cinemaItem.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      channel: { select: { slug: true, displayName: true } },
      assets: { select: { kind: true, fileRef: true }, take: 6 },
    },
  });
  console.log(JSON.stringify({ channels, itemCount, assetCount, sample }, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await p.$disconnect(); } catch {}
  process.exit(1);
});
