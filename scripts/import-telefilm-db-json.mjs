import fs from "node:fs";
import { PrismaClient, CinemaAssetKind, CinemaChannelRole, CinemaSourcePlatform } from "@prisma/client";

const prisma = new PrismaClient();

const INPUT_PATH = process.env.TELEFILM_EXPORT_JSON || "D:/telefilm/movies_export.json";
const CHANNEL_SLUG = process.env.TELEFILM_DB_CHANNEL_SLUG || "telefilm-db";
const CHANNEL_NAME = process.env.TELEFILM_DB_CHANNEL_NAME || "Telefilm DB Source";
const TELEFILM_BACKEND_URL = process.env.TELEFILM_BACKEND_URL || "http://127.0.0.1:9999";

function toDisplayTitle(raw) {
  const base = String(raw ?? "").trim();
  if (!base) return "Untitled";
  return base
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input not found: ${INPUT_PATH}`);
  }

  const rows = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error("Invalid input JSON.");
  }

  const channel = await prisma.cinemaChannel.upsert({
    where: { slug: CHANNEL_SLUG },
    update: {
      displayName: CHANNEL_NAME,
      sourceChannelId: "telefilm-db",
      platform: CinemaSourcePlatform.TELEGRAM,
      role: CinemaChannelRole.FULL_SOURCE,
      isEnabled: true,
    },
    create: {
      slug: CHANNEL_SLUG,
      displayName: CHANNEL_NAME,
      sourceChannelId: "telefilm-db",
      platform: CinemaSourcePlatform.TELEGRAM,
      role: CinemaChannelRole.FULL_SOURCE,
      isEnabled: true,
    },
  });

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const movieId = String(row.id ?? "").trim();
    const title = toDisplayTitle(row.title);
    if (!movieId || !title) continue;

    const item = await prisma.cinemaItem.upsert({
      where: {
        channelId_sourceMessageId: {
          channelId: channel.id,
          sourceMessageId: `telefilm-db-${movieId}`,
        },
      },
      update: {
        title,
        description: row.file_id ? `Source: ${row.file_id}` : null,
      },
      create: {
        channelId: channel.id,
        sourceMessageId: `telefilm-db-${movieId}`,
        title,
        description: row.file_id ? `Source: ${row.file_id}` : null,
      },
    });

    if (item.createdAt.getTime() === item.updatedAt.getTime()) inserted += 1;
    else updated += 1;

    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.FULL } },
      update: {
        provider: "telefilm-stream",
        fileRef: `telefilm://movie/${movieId}`,
        mimeType: "video/mp4",
      },
      create: {
        itemId: item.id,
        kind: CinemaAssetKind.FULL,
        provider: "telefilm-stream",
        fileRef: `telefilm://movie/${movieId}`,
        mimeType: "video/mp4",
      },
    });

    const posterRaw = row.poster_url ? String(row.poster_url) : "";
    if (posterRaw) {
      const posterPath = posterRaw.replace(/^\/?static\//, "");
      const poster = posterRaw.startsWith("http")
        ? posterRaw
        : `/api/cinema/telefilm-static/${posterPath}`;
      await prisma.cinemaAsset.upsert({
        where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.POSTER } },
        update: { provider: "telefilm-db", fileRef: poster, mimeType: "image/jpeg" },
        create: { itemId: item.id, kind: CinemaAssetKind.POSTER, provider: "telefilm-db", fileRef: poster, mimeType: "image/jpeg" },
      });
    }

    const previewRaw = row.preview_url ? String(row.preview_url) : "";
    if (previewRaw) {
      const previewPath = previewRaw.replace(/^\/?static\//, "");
      const preview = previewRaw.startsWith("http")
        ? previewRaw
        : `/api/cinema/telefilm-static/${previewPath}`;
      await prisma.cinemaAsset.upsert({
        where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.PREVIEW } },
        update: { provider: "telefilm-db", fileRef: preview, mimeType: "video/mp4" },
        create: { itemId: item.id, kind: CinemaAssetKind.PREVIEW, provider: "telefilm-db", fileRef: preview, mimeType: "video/mp4" },
      });
    }
  }

  console.log(JSON.stringify({ ok: true, channel: channel.slug, inserted, updated, sourceCount: rows.length }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
