export type PlatformKey = "discord" | "telegram";

export function toPrismaPlatform(platform: PlatformKey) {
  return platform === "telegram" ? "TELEGRAM" : "DISCORD";
}

export function fromPrismaPlatform(platform: string | null | undefined): PlatformKey {
  return platform === "TELEGRAM" ? "telegram" : "discord";
}

export function legacyUserIdFor(platform: PlatformKey, platformUserId: string) {
  return platform === "telegram" ? `tg_${platformUserId}` : platformUserId;
}
