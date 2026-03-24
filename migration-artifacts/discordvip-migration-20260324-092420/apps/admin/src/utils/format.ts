export function currency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function datetime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export function formatDiscordUser(discordUserId: string, discordDisplayName?: string | null) {
  return discordDisplayName ? `${discordDisplayName} (${discordUserId})` : discordUserId;
}

export function formatPlatformUser(input: {
  platform: "discord" | "telegram";
  platformUserId: string;
  discordDisplayName?: string | null;
}) {
  if (input.platform === "discord") {
    return formatDiscordUser(input.platformUserId, input.discordDisplayName);
  }

  return `Telegram (${input.platformUserId})`;
}
