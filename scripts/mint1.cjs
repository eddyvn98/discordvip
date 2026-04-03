const {PrismaClient}=require('@prisma/client');
const crypto=require('crypto');
const {nanoid}=require('nanoid');
const p=new PrismaClient();
(async()=>{
 const token=nanoid(32);
 await p.cinemaAccessTicket.create({data:{tokenHash:crypto.createHash('sha256').update(token).digest('hex'),platform:'TELEGRAM',platformUserId:'116836781',platformChatId:'-3749586011',expiresAt:new Date(Date.now()+3600_000)}});
 console.log(token);
 await p.$disconnect();
})();
