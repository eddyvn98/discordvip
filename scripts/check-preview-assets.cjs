const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ch = await p.cinemaChannel.findFirst({ where: { slug: 'telefilm-db' }, select: { id: true } });
  const items = await p.cinemaItem.findMany({
    where: { channelId: ch.id },
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: { assets: { where: { kind: { in: ['POSTER','PREVIEW','FULL'] } }, select: { kind: true, fileRef: true } } },
  });
  console.log(JSON.stringify(items.map(i => ({ title: i.title, assets: i.assets })), null, 2));
  await p.$disconnect();
})().catch(async (e) => { console.error(e); try { await p.$disconnect(); } catch {}; process.exit(1); });
