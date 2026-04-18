
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const channels = await prisma.cinemaChannel.findMany()
    console.log(JSON.stringify(channels, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
