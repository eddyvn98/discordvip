import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const transactionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  transaction_id: z.union([z.string(), z.number()]).optional(),
  transferAmount: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
  transferContent: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  referenceCode: z.string().optional(),
  gateway: z.string().optional(),
  accountName: z.string().optional(),
});

export type NormalizedSepayPayload = {
  transactionId: string;
  amount: number;
  transferContent: string;
  bankRef: string | null;
  payerName: string | null;
  providerEventId: string | null;
  raw: unknown;
};

export function normalizeSepayPayload(payload: unknown): NormalizedSepayPayload {
  const envelope = z
    .object({
      id: z.union([z.string(), z.number()]).optional(),
      data: z.unknown().optional(),
      transferAmount: z.coerce.number().optional(),
      amount: z.coerce.number().optional(),
      transferContent: z.string().optional(),
      content: z.string().optional(),
      description: z.string().optional(),
      referenceCode: z.string().optional(),
      accountName: z.string().optional(),
    })
    .passthrough()
    .parse(payload);

  const nestedPayload = envelope.data ?? envelope;
  const normalized = transactionSchema.parse(nestedPayload);

  const explicitTransactionId = normalized.id ?? normalized.transaction_id ?? envelope.id;
  if (!explicitTransactionId) {
    throw new Error("Payload SePay thiếu transaction id.");
  }

  const transactionId = String(explicitTransactionId);

  const amount =
    normalized.transferAmount ??
    normalized.amount ??
    envelope.transferAmount ??
    envelope.amount ??
    0;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payload SePay thiếu số tiền hợp lệ.");
  }
  const transferContent =
    normalized.transferContent ??
    normalized.content ??
    normalized.description ??
    envelope.transferContent ??
    envelope.content ??
    envelope.description ??
    "";

  return {
    transactionId,
    amount,
    transferContent,
    bankRef: normalized.referenceCode ?? envelope.referenceCode ?? null,
    payerName: normalized.accountName ?? envelope.accountName ?? null,
    providerEventId: envelope.id ? String(envelope.id) : null,
    raw: payload,
  };
}

export function verifySepaySignature(rawBody: string, secret: string, signature: string | null) {
  if (!secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
