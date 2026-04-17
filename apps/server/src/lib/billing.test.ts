import { describe, expect, it } from "vitest";

import { calculateExtendedExpiry, extractOrderCode, normalizeOrderCodeToken } from "./billing.js";
import { normalizeSepayPayload } from "./sepay.js";

describe("billing helpers", () => {
  it("extends from current expiry when membership is still active", () => {
    const now = new Date("2026-03-08T00:00:00.000Z");
    const current = new Date("2026-03-20T00:00:00.000Z");

    const next = calculateExtendedExpiry(current, 30, now);
    expect(next.toISOString()).toBe("2026-04-19T00:00:00.000Z");
  });

  it("extracts order code from transfer content", () => {
    expect(extractOrderCode("nap vip VIP ABCD1234")).toBe("ABCD1234");
    expect(extractOrderCode("BXAP8VZHRP")).toBe("BXAP8VZHRP");
    expect(extractOrderCode("DONATE R23VOIUMO")).toBe("R23VOIUMO");
    expect(extractOrderCode("DONATE 8AGCQZUSAO-050426-14:53:00 6095ASCB02YKR9YP")).toBe("8AGCQZUSAO");
    expect(extractOrderCode("hello")).toBeNull();
  });

  it("normalizes order code tokens by removing separators", () => {
    expect(normalizeOrderCodeToken("R2-3VOIUMO")).toBe("R23VOIUMO");
    expect(normalizeOrderCodeToken("r2_3voiumo")).toBe("R23VOIUMO");
  });

  it("normalizes nested SePay payload", () => {
    const normalized = normalizeSepayPayload({
      id: "evt_1",
      data: {
        transaction_id: 1234,
        transferAmount: 30000,
        transferContent: "VIP ORDER01",
        referenceCode: "REF001",
      },
    });

    expect(normalized.transactionId).toBe("1234");
    expect(normalized.amount).toBe(30000);
    expect(normalized.transferContent).toBe("VIP ORDER01");
    expect(normalized.bankRef).toBe("REF001");
  });
});
