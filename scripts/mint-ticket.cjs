const {PrismaClient}=require('@prisma/client');
const crypto=require('crypto');
const {nanoid}=require('nanoid');
const p=new PrismaClient();
(async()=>{
  const token=nanoid(32);
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt=new Date(Date.now()+60*60*1000);
  await p.cinemaAccessTicket.create({data:{tokenHash,platform:'TELEGRAM',platformUserId:'116836781',platformChatId:'-3749586011',expiresAt}});
  console.log(JSON.stringify({token,expiresAt:expiresAt.toISOString()},null,2));
  await p.$disconnect();
})().catch(async e=>{console.error(e); try{await p.$disconnect()}catch{}; process.exit(1)});
