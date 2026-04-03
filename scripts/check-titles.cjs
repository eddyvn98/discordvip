const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
 const ch=await p.cinemaChannel.findFirst({where:{slug:'telefilm-db'},select:{id:true}});
 const rows=await p.cinemaItem.findMany({where:{channelId:ch.id},take:5,orderBy:{createdAt:'desc'},select:{title:true}});
 console.log(JSON.stringify(rows,null,2));
 await p.$disconnect();
})().catch(async e=>{console.error(e); try{await p.$disconnect()}catch{}; process.exit(1)});
