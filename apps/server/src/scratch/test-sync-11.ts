import { PrismaClient } from "@prisma/client";
import { CinemaScanJobService } from "../services/cinema/cinema-scan-job-service.js";
import { CinemaMediaService } from "../services/cinema/cinema-media-service.js";
import { CinemaChannelService } from "../services/cinema/cinema-channel-service.js";
import { CinemaItemService } from "../services/cinema/cinema-item-service.js";
import { CinemaViewService } from "../services/cinema/cinema-view-service.js";

const prisma = new PrismaClient();

async function main() {
  const mediaService = new CinemaMediaService();
  const channelService = new CinemaChannelService();
  const viewService = new CinemaViewService();
  const itemService = new CinemaItemService(viewService);
  const scanService = new CinemaScanJobService(mediaService, channelService);

  const directoryPath = "E:\\linh tinh";
  console.log(`[*] Triggering sync for path: ${directoryPath}`);

  const job = await scanService.createScanJob({ requestedBy: "system-test" });
  console.log(`[+] Created Job ID: ${job.id}`);

  try {
    await scanService.runLocalUploadJob(job.id, directoryPath);
    console.log("[+] Sync completed successfully!");
  } catch (err) {
    console.error("[-] Sync failed:", err);
  } finally {
    const finalCount = await prisma.cinemaItem.count({
      where: { channel: { displayName: "linh tinh" } }
    });
    console.log(`[*] Final movie count for 'linh tinh': ${finalCount}`);
    await prisma.$disconnect();
  }
}

main().catch(console.error);
