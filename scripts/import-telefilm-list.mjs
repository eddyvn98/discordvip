import fs from "node:fs";
import path from "node:path";
import { PrismaClient, CinemaAssetKind, CinemaChannelRole, CinemaSourcePlatform } from "@prisma/client";

const prisma = new PrismaClient();

const TELEFILM_LIST_PATH = process.env.TELEFILM_LIST_PATH || "D:/telefilm/all_movies_list.txt";
const CHANNEL_SLUG = process.env.TELEFILM_CHANNEL_SLUG || "telefilm-import";
const CHANNEL_NAME = process.env.TELEFILM_CHANNEL_NAME || "Telefilm Import";
const SOURCE_CHANNEL_ID = process.env.TELEFILM_SOURCE_CHANNEL_ID || "telefilm-list";
const FULL_PLACEHOLDER =
  process.env.TELEFILM_FULL_PLACEHOLDER ||
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const PREVIEW_PLACEHOLDER =
  process.env.TELEFILM_PREVIEW_PLACEHOLDER ||
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function parseMovieLines(text) {
  const rows = [];
  const lines = text.split(/\r?\n/u);
  for (const line of lines) {
    const m = line.match(/^ID:\s*(\d+)\s*\|.*Title:\s*(.+)$/u);
    if (!m) continue;
    const id = m[1].trim();
    const title = m[2].trim();
    if (!id || !title) continue;
    rows.push({ sourceId: id, title });
  }
  return rows;
}

async function main() {
  if (!fs.existsSync(TELEFILM_LIST_PATH)) {
    throw new Error(`File not found: ${TELEFILM_LIST_PATH}`);
  }

  const raw = fs.readFileSync(TELEFILM_LIST_PATH, "utf8");
  const movies = parseMovieLines(raw);
  if (!movies.length) {
    console.log("No movies found in source list.");
    return;
  }

  const channel = await prisma.cinemaChannel.upsert({
    where: { slug: CHANNEL_SLUG },
    update: {
      displayName: CHANNEL_NAME,
      sourceChannelId: SOURCE_CHANNEL_ID,
      platform: CinemaSourcePlatform.TELEGRAM,
      role: CinemaChannelRole.FULL_SOURCE,
      isEnabled: true,
    },
    create: {
      slug: CHANNEL_SLUG,
      displayName: CHANNEL_NAME,
      sourceChannelId: SOURCE_CHANNEL_ID,
      platform: CinemaSourcePlatform.TELEGRAM,
      role: CinemaChannelRole.FULL_SOURCE,
      isEnabled: true,
    },
  });

  let inserted = 0;
  let updated = 0;

  for (const movie of movies) {
    const sourceMessageId = `tf-${movie.sourceId}`;
    const item = await prisma.cinemaItem.upsert({
      where: {
        channelId_sourceMessageId: {
          channelId: channel.id,
          sourceMessageId,
        },
      },
      update: {
        title: movie.title,
      },
      create: {
        channelId: channel.id,
        sourceMessageId,
        title: movie.title,
        description: "Imported from D:/telefilm/all_movies_list.txt",
      },
    });

    if (item.createdAt.getTime() === item.updatedAt.getTime()) inserted += 1;
    else updated += 1;

    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.FULL } },
      update: {
        provider: "telefilm-list-placeholder",
        fileRef: FULL_PLACEHOLDER,
        mimeType: "video/mp4",
      },
      create: {
        itemId: item.id,
        kind: CinemaAssetKind.FULL,
        provider: "telefilm-list-placeholder",
        fileRef: FULL_PLACEHOLDER,
        mimeType: "video/mp4",
      },
    });

    const posterUrl = `https://picsum.photos/seed/telefilm-${encodeURIComponent(movie.sourceId)}/480/720`;
    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.POSTER } },
      update: {
        provider: "telefilm-poster-seed",
        fileRef: posterUrl,
        mimeType: "image/jpeg",
      },
      create: {
        itemId: item.id,
        kind: CinemaAssetKind.POSTER,
        provider: "telefilm-poster-seed",
        fileRef: posterUrl,
        mimeType: "image/jpeg",
      },
    });

    await prisma.cinemaAsset.upsert({
      where: { itemId_kind: { itemId: item.id, kind: CinemaAssetKind.PREVIEW } },
      update: {
        provider: "telefilm-preview-placeholder",
        fileRef: PREVIEW_PLACEHOLDER,
        mimeType: "video/mp4",
      },
      create: {
        itemId: item.id,
        kind: CinemaAssetKind.PREVIEW,
        provider: "telefilm-preview-placeholder",
        fileRef: PREVIEW_PLACEHOLDER,
        mimeType: "video/mp4",
      },
    });
  }

  const total = await prisma.cinemaItem.count({ where: { channelId: channel.id } });
  console.log(
    JSON.stringify(
      {
        ok: true,
        source: path.resolve(TELEFILM_LIST_PATH),
        channel: { id: channel.id, slug: channel.slug, name: channel.displayName },
        importedRows: movies.length,
        inserted,
        updated,
        channelTotalItems: total,
        notes: "Imported title list with synthetic posters and preview/full placeholder assets.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
