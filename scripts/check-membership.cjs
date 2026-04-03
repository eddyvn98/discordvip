const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const users = await p.membership.findMany({
    where: { platform: 'TELEGRAM' },
    orderBy: { expireAt: 'desc' },
    take: 10,
    select: { platformUserId: true, platformChatId: true, expireAt: true, source: true }
  });
  console.log(JSON.stringify(users, null, 2));
  await p.$disconnect();
})().catch(async (e) => { console.error(e); try { await p.$disconnect(); } catch {} ; process.exit(1); });
