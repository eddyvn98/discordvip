export function calculateExtendedExpiry(
  currentExpireAt: Date | null,
  durationDays: number,
  now = new Date(),
) {
  const baseDate =
    currentExpireAt && currentExpireAt.getTime() > now.getTime()
      ? currentExpireAt
      : now;

  return new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

export function normalizeOrderCodeToken(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function extractOrderCode(transferContent: string | null | undefined) {
  if (!transferContent) {
    return null;
  }

  const normalized = transferContent.toUpperCase();
  // Banks may append metadata right after the order code (e.g. DONATE ABCD1234XY-050426-...).
  // We only need the 10-char order code token following VIP/DONATE.
  const prefixedMatch = normalized.match(/\b(?:VIP|DONATE)\s+([A-Z0-9]{10})(?=[^A-Z0-9]|$)/);
  if (prefixedMatch?.[1]) {
    return prefixedMatch[1];
  }

  // Fallback for transfers that only include the raw order code, e.g. "BXAP8VZHRP".
  const standaloneMatch = normalized.match(/\b([A-Z0-9_-]{10})\b/);
  return standaloneMatch?.[1] ?? null;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildVietQrImageUrl({
  bankBin,
  accountNumber,
  accountName,
  amount,
  orderCode,
}: {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  orderCode: string;
}) {
  if (!bankBin || !accountNumber || !accountName) {
    return null;
  }

  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: `DONATE ${orderCode}`,
    accountName,
  });

  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?${params.toString()}`;
}
