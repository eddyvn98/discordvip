const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ch = await p.cinemaChannel.findFirst({ where: { slug: 'telefilm-db' }, select: { id: true } });
  if (!ch) { console.log('no telefilm-db channel'); await p.$disconnect(); return; }
  const items = await p.cinemaItem.findMany({
    where: { channelId: ch.id },
    select: { id: true, sourceMessageId: true },
  });
  let created = 0;
  for (const item of items) {
    const existing = await p.cinemaAsset.findUnique({ where: { itemId_kind: { itemId: item.id, kind: 'POSTER' } } });
    if (existing) continue;
    const seed = encodeURIComponent(item.sourceMessageId || item.id);
    const url = `https://picsum.photos/seed/${seed}/480/720`;
    await p.cinemaAsset.create({
      data: {
        itemId: item.id,
        kind: 'POSTER',
        provider: 'placeholder',
        fileRef: url,
        mimeType: 'image/jpeg',
      },
    });
    created += 1;
  }
  console.log(JSON.stringify({ ok: true, created }, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await p.$disconnect(); } catch {}
  process.exit(1);
});
