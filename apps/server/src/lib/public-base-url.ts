import { existsSync, readFileSync } from "node:fs";

import { env } from "../config.js";

const REFRESH_MS = 3000;
const TRY_CLOUDFLARE_HOST_RX = /^[a-z0-9-]+\.trycloudflare\.com$/iu;
const TRY_CLOUDFLARE_URL_RX = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/giu;

let cachedValue = "";
let cachedAt = 0;

function normalizeUrl(value: string): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/u, "");
  } catch {
    return null;
  }
}

function readRuntimeUrlFromFile(): string | null {
  const filePath = env.CINEMA_PUBLIC_BASE_URL_FILE.trim();
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf8");
    return normalizeUrl(raw);
  } catch {
    return null;
  }
}

function readRuntimeUrlFromLogFile(): string | null {
  const filePath = env.CINEMA_PUBLIC_BASE_URL_LOG_FILE.trim();
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf8");
    const matches = raw.match(TRY_CLOUDFLARE_URL_RX);
    if (!matches || matches.length === 0) return null;
    return normalizeUrl(matches[matches.length - 1] ?? "");
  } catch {
    return null;
  }
}

export function getCinemaPublicBaseUrl(): string {
  const now = Date.now();
  if (now - cachedAt < REFRESH_MS && cachedValue) {
    return cachedValue;
  }

  const runtime = readRuntimeUrlFromFile() ?? readRuntimeUrlFromLogFile();
  const fallback = normalizeUrl(env.CINEMA_PUBLIC_BASE_URL) ?? env.CINEMA_PUBLIC_BASE_URL;
  cachedValue = runtime ?? fallback;
  cachedAt = now;
  return cachedValue;
}

export function getCinemaPublicOrigin(): string {
  return new URL(getCinemaPublicBaseUrl()).origin;
}

export function isTryCloudflareOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return TRY_CLOUDFLARE_HOST_RX.test(url.hostname);
  } catch {
    return false;
  }
}
