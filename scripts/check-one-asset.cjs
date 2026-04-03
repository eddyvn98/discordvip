const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ch = await p.cinemaChannel.findFirst({ where: { slug: 'telefilm-db' }, select: { id: true } });
  const item = await p.cinemaItem.findFirst({ where: { channelId: ch.id }, orderBy: { createdAt: 'desc' }, include: { assets: { where: { kind: { in: ['POSTER','PREVIEW'] } }, select: { kind: true, fileRef: true } } } });
  console.log(JSON.stringify(item.assets, null, 2));
  await p.$disconnect();
})().catch(async (e) => { console.error(e); try { await p.$disconnect(); } catch {}; process.exit(1); });
