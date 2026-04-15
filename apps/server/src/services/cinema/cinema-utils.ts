import crypto from "node:crypto";
import type { Request } from "express";
import { Platform } from "@prisma/client";
import { env } from "../../config.js";

export function b64(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

export function fromB64(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function sign(input: string) {
  return crypto.createHmac("sha256", env.CINEMA_ENTRY_SECRET).update(input).digest("base64url");
}

export function hashStr(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export function inferMediaTypeFromMime(mimeType?: string | null) {
  const mime = String(mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image" as const;
  return "video" as const;
}

export function toWebAssetRef(fileRef?: string | null) {
  const ref = String(fileRef ?? "");
  if (!ref) return null;
  if (ref.startsWith("tgfile://")) {
    const fileId = ref.slice("tgfile://".length).trim();
    if (!fileId) return null;
    return `/api/cinema/media/telegram/${encodeURIComponent(fileId)}`;
  }
  if (ref.startsWith("localfile://")) {
    const rel = ref.slice("localfile://".length).replace(/^\/+/u, "");
    if (!rel) return null;
    return `/api/cinema/local-media/${rel.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
  }
  return ref;
}

export function buildFingerprint(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || "";
  const ua = String(req.headers["user-agent"] ?? "");
  return hashStr(`${ip}|${ua}`);
}

export function platformToPrisma(platform: "discord" | "telegram") {
  return platform === "discord" ? Platform.DISCORD : Platform.TELEGRAM;
}

export function extractEntityList(text: string, labels: string[]) {
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|");
  const rx = new RegExp(`(?:^|\\n|\\r)\\s*(?:${escapedLabels})\\s*[:：-]\\s*([^\\n\\r]+)`, "giu");
  const out = new Set<string>();
  let match: RegExpExecArray | null = null;
  while ((match = rx.exec(text)) !== null) {
    const raw = String(match[1] ?? "");
    raw
      .split(/[;,|/]|(?:\s{2,})|(?:\s[-–]\s)|(?:\s{0,1}&\s{0,1})|(?:\s{0,1}và\s{0,1})|(?:\s{0,1}and\s{0,1})/giu)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => out.add(item));
  }
  return [...out];
}

export function extractActorsAndGenres(input: { title: string; description: string | null }) {
  const text = `${input.title}\n${input.description ?? ""}`;
  const actors = extractEntityList(text, ["diễn viên", "dien vien", "actor", "cast", "actors", "starring"]);
  const genres = extractEntityList(text, ["thể loại", "the loai", "genre", "genres", "tag", "tags", "category", "categories"]);
  return { actors, genres };
}

export function toPrettyMovieTitle(rawTitle: string, fallbackId?: string) {
  let title = String(rawTitle ?? "").trim();
  if (!title) return fallbackId ? `Phim #${fallbackId}` : "Phim";
  title = title.replace(/^file\s*[:\-]\s*/iu, "");
  if (/^telegram\s+post\s*#\d+$/iu.test(title)) title = "";
  title = title.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/iu, "");
  title = title.replace(/[_]+/gu, " ");
  title = title.replace(/[.]{2,}/gu, " ");
  title = title.replace(/\s+/gu, " ").trim();
  if (!title) return fallbackId ? `Phim #${fallbackId}` : "Phim";
  if (/^[a-z]/u.test(title)) title = title.charAt(0).toUpperCase() + title.slice(1);
  return title.slice(0, 180);
}

export async function callTelegramApi<T = any>(method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Telegram ${method} failed: ${response.status}`);
  const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(data.description || `Telegram ${method} returned error`);
  return data.result as T;
}

export function pickTelegramMessageFileId(message: any) {
  if (message?.video?.file_id) {
    return { fileId: String(message.video.file_id), mimeType: String(message.video.mime_type || "video/mp4") };
  }
  if (Array.isArray(message?.photo) && message.photo.length > 0) {
    const photo = message.photo[message.photo.length - 1];
    if (photo?.file_id) return { fileId: String(photo.file_id), mimeType: "image/jpeg" };
  }
  if (message?.document?.file_id) {
    return { fileId: String(message.document.file_id), mimeType: String(message.document.mime_type || "application/octet-stream") };
  }
  return null;
}
