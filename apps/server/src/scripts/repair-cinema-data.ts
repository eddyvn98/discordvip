import { PrismaClient, CinemaScanJobStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[*] Starting Cinema Data Repair...");

  // 1. Mark stalled jobs as FAILED if they are not picked up by the service
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const stalled = await prisma.cinemaScanJob.updateMany({
    where: {
      status: "RUNNING",
      OR: [
        { lastHeartbeatAt: { lt: fiveMinutesAgo } },
        { lastHeartbeatAt: null, startedAt: { lt: fiveMinutesAgo } },
      ],
    },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      failureReason: "Job stalled or server restarted (repaired by script).",
    },
  });
  console.log(`[*] Marked ${stalled.count} stalled jobs as FAILED.`);

  // 2. Detect duplicate channels (same sourceChannelId)
  const channels = await prisma.cinemaChannel.findMany({
    orderBy: { createdAt: "asc" },
  });

  const seenSourceIds = new Map<string, string>(); // sourceId -> id
  let duplicatesFound = 0;

  for (const channel of channels) {
    if (seenSourceIds.has(channel.sourceChannelId)) {
      console.log(`[!] Duplicate mapping found: "${channel.displayName}" (${channel.id}) shares source ID ${channel.sourceChannelId} with ${seenSourceIds.get(channel.sourceChannelId)}`);
      // Mark the newer one as disabled
      await prisma.cinemaChannel.update({
        where: { id: channel.id },
        data: { isEnabled: false },
      });
      duplicatesFound++;
    } else {
      seenSourceIds.set(channel.sourceChannelId, channel.id);
    }
  }

  // 3. Detect potential duplicate channels by name (best effort)
  const nameGroups = new Map<string, string[]>(); // name -> IDs
  for (const channel of channels) {
    const list = nameGroups.get(channel.displayName) || [];
    list.push(channel.id);
    nameGroups.set(channel.displayName, list);
  }

  for (const [name, ids] of nameGroups.entries()) {
    if (ids.length > 1) {
      console.log(`[?] Potential duplication by name: "${name}" occurs ${ids.length} times in DB.`);
    }
  }

  console.log(`[*] Repair complete. Disabled ${duplicatesFound} duplicate channels.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
