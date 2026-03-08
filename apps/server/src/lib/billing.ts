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

export function extractOrderCode(transferContent: string | null | undefined) {
  if (!transferContent) {
    return null;
  }

  const match = transferContent.toUpperCase().match(/\bVIP\s+([A-Z0-9_-]{6,})\b/);
  return match?.[1] ?? null;
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
    addInfo: `VIP ${orderCode}`,
    accountName,
  });

  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?${params.toString()}`;
}
