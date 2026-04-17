import crypto from "node:crypto";
import { Readable } from "node:stream";

import type { Request, Response } from "express";

import { env } from "../config.js";
import { getCinemaPublicOrigin, isTryCloudflareOrigin } from "../lib/public-base-url.js";

export function isSameOriginPlaybackRequest(req: Request): boolean {
  const expectedOrigin = getCinemaPublicOrigin();
  const adminOrigin = (() => {
    try {
      return new URL(env.ADMIN_APP_URL).origin;
    } catch {
      return "";
    }
  })();
  const allowedFirstPartyOrigins = new Set<string>([expectedOrigin, adminOrigin, "http://localhost:13002"]);

  if (env.DEV_BYPASS_ADMIN_AUTH) {
    allowedFirstPartyOrigins.add("http://127.0.0.1:13002");
  }
  const origin = String(req.headers.origin ?? "").trim();
  const referer = String(req.headers.referer ?? "").trim();
  const telegramHosts = new Set(["web.telegram.org", "t.me"]);
  const isTelegramOrigin = (value: string) => {
    if (!value) return false;
    try {
      const u = new URL(value);
      return telegramHosts.has(u.hostname);
    } catch {
      return false;
    }
  };
  if (!origin && !referer) return true;
  if (isTelegramOrigin(origin) || isTelegramOrigin(referer)) return true;
  if ((origin && isTryCloudflareOrigin(origin)) || (referer && isTryCloudflareOrigin(referer))) return true;
  if (origin && !allowedFirstPartyOrigins.has(origin)) return false;
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedFirstPartyOrigins.has(refererOrigin)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function makeTelefilmInitData(telegramUserId: string): string {
  const authDate = Math.floor(Date.now() / 1000).toString();
  const user = JSON.stringify({ id: Number(telegramUserId) || telegramUserId });
  const pairs: Array<[string, string]> = [
    ["auth_date", authDate],
    ["user", user],
  ];
  const dataCheckString = [...pairs]
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(env.TELEGRAM_BOT_TOKEN).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const params = new URLSearchParams();
  for (const [k, v] of pairs) params.set(k, v);
  params.set("hash", hash);
  return params.toString();
}

export async function proxyStaticFile(path: string, res: Response): Promise<void> {
  const url = new URL(`/static/${path}`, env.TELEFILM_BACKEND_URL);
  const upstream = await fetch(url.toString());
  if (!upstream.ok || !upstream.body) {
    res.status(upstream.status).end();
    return;
  }
  const contentType = upstream.headers.get("content-type");
  const contentLength = upstream.headers.get("content-length");
  if (contentType) res.setHeader("content-type", contentType);
  if (contentLength) res.setHeader("content-length", contentLength);
  res.status(upstream.status);
  Readable.fromWeb(upstream.body as any).pipe(res);
}

const STREAM_PASS_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
] as const;

export async function proxyTelefilmStream(
  req: Request,
  res: Response,
  movieId: string,
  initData: string,
): Promise<void> {
  const url = new URL(`/api/stream/${encodeURIComponent(movieId)}`, env.TELEFILM_BACKEND_URL);
  url.searchParams.set("init_data", initData);

  const upstreamHeaders: Record<string, string> = {};
  if (typeof req.headers.range === "string" && req.headers.range.trim()) {
    upstreamHeaders.range = req.headers.range;
  }

  const upstream = await fetch(url.toString(), { headers: upstreamHeaders });
  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    res.status(upstream.status).json({
      error: detail || "Failed to fetch stream from telefilm backend.",
    });
    return;
  }

  for (const header of STREAM_PASS_HEADERS) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  res.status(upstream.status);
  Readable.fromWeb(upstream.body as any).pipe(res);
}
