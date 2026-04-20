import { CinemaAssetKind, CinemaSourcePlatform } from "@prisma/client";
import { env } from "../../config.js";
import { prisma } from "../../prisma.js";
import { b64, callTelegramApi, fromB64, inferMediaTypeFromMime, nowSec, sign } from "./cinema-utils.js";

export class CinemaStreamService {
  makeStreamToken(input: { itemId: string; kind: "full"; userId: string }) {
    const exp = nowSec() + env.CINEMA_STREAM_TOKEN_TTL_SECONDS;
    const payload = b64(JSON.stringify({ ...input, exp }));
    return `${payload}.${sign(payload)}`;
  }

  parseStreamToken(token: string) {
    const [payloadEncoded, signature] = token.split(".");
    if (!payloadEncoded || !signature || sign(payloadEncoded) !== signature) throw new Error("Invalid stream token.");
    const payload = JSON.parse(fromB64(payloadEncoded)) as { itemId: string; kind: "full"; userId: string; exp: number };
    if (payload.exp <= nowSec()) throw new Error("Stream token has expired.");
    return payload;
  }

  async getSignedPlaybackLinks(input: { itemId: string; userId: string }) {
    const item = await prisma.cinemaItem.findUnique({
      where: { id: input.itemId },
      select: {
        id: true,
        sourceMessageId: true,
        channel: { select: { sourceChannelId: true, platform: true } },
      },
    });
    const fullAsset = await prisma.cinemaAsset.findFirst({
      where: { itemId: input.itemId, kind: CinemaAssetKind.FULL },
      select: { mimeType: true, fileRef: true },
    });
    const fullRef = String(fullAsset?.fileRef ?? "");
    const mediaType = inferMediaTypeFromMime(fullAsset?.mimeType);
    if (fullRef.startsWith("tgfile://")) {
      const fileId = fullRef.slice("tgfile://".length).trim();

      // If fileId contains a colon, it's a channelId:messageId pointer, not a real file_id.
      // These should always go through the Telethon proxy since the Bot API can't handle them.
      if (fileId.includes(":")) {
        return {
          fullUrl: `/api/cinema/media/telegram-big/${encodeURIComponent(input.itemId)}`,
          mediaType,
          external: false,
        };
      }

      try {
        await callTelegramApi("getFile", { file_id: fileId });
      } catch (error) {
        const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        const sourceChatId = String(item?.channel?.sourceChannelId ?? "").trim();
        const sourceMessageId = String(item?.sourceMessageId ?? "").trim();
        if (
          msg.includes("file is too big") &&
          item?.channel?.platform === CinemaSourcePlatform.TELEGRAM &&
          /^-100\d+$/u.test(sourceChatId) &&
          /^\d+$/u.test(sourceMessageId)
        ) {
          return {
            fullUrl: `/api/cinema/media/telegram-big/${encodeURIComponent(input.itemId)}`,
            mediaType,
            external: false,
          };
        }
      }
      return {
        fullUrl: `/api/cinema/media/telegram/${encodeURIComponent(fileId)}?itemId=${encodeURIComponent(input.itemId)}&kind=full`,
        mediaType,
        external: false,
      };
    }
    return {
      fullUrl: `/api/cinema/stream/${input.itemId}/full?token=${encodeURIComponent(this.makeStreamToken({ itemId: input.itemId, kind: "full", userId: input.userId }))}`,
      mediaType,
      external: false,
    };
  }

  async resolveStream(input: { itemId: string; kind: "full"; token: string }) {
    const payload = this.parseStreamToken(input.token);
    if (payload.itemId !== input.itemId || payload.kind !== input.kind) {
      throw new Error("Stream token does not match this item.");
    }
    return prisma.cinemaAsset.findFirst({
      where: { itemId: input.itemId, kind: CinemaAssetKind.FULL },
    }).then((asset) => {
      if (!asset) throw new Error("Asset not found.");
      const tokenUserId = String(payload.userId ?? "");
      const userId = tokenUserId.includes(":") ? tokenUserId.split(":")[1] ?? "" : tokenUserId;
      return { asset, userId };
    });
  }

  async resolveTelegramFile(fileId: string, rangeHeader?: string) {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!response.ok) throw new Error(`Telegram getFile failed: ${response.status}`);
    const data = (await response.json()) as { ok: boolean; result?: { file_path?: string }; description?: string };
    if (!data.ok || !data.result?.file_path) {
      throw new Error(data.description || "Telegram getFile returned error");
    }
    const filePath = data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const fileResponse = await fetch(fileUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : undefined,
    });
    if (!fileResponse.ok || !fileResponse.body) {
      throw new Error(`Telegram file download failed: ${fileResponse.status}`);
    }
    return {
      statusCode: fileResponse.status,
      stream: fileResponse.body,
      contentType: fileResponse.headers.get("content-type") || "application/octet-stream",
      contentLength: fileResponse.headers.get("content-length"),
      contentRange: fileResponse.headers.get("content-range"),
      acceptRanges: fileResponse.headers.get("accept-ranges"),
      cacheControl: fileResponse.headers.get("cache-control") || "public, max-age=86400",
    };
  }
}
