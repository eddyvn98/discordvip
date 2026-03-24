import { describe, expect, it } from "vitest";

import { calculateManualMembershipExpireAt } from "./membership-service.js";

describe("manual membership expiry", () => {
  it("creates a new expiry from now when user has no active membership", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    const next = calculateManualMembershipExpireAt(null, 30, now);

    expect(next.toISOString()).toBe("2026-04-12T00:00:00.000Z");
  });

  it("extends from current expiry when user is still active", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");
    const currentExpireAt = new Date("2026-03-20T00:00:00.000Z");

    const next = calculateManualMembershipExpireAt(currentExpireAt, 30, now);

    expect(next.toISOString()).toBe("2026-04-19T00:00:00.000Z");
  });

  it("resets from now when the previous membership is already expired", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");
    const currentExpireAt = new Date("2026-03-01T00:00:00.000Z");

    const next = calculateManualMembershipExpireAt(currentExpireAt, 15, now);

    expect(next.toISOString()).toBe("2026-03-28T00:00:00.000Z");
  });

  it("subtracts days from the current expiry when the adjustment is negative", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");
    const currentExpireAt = new Date("2026-05-12T00:14:53.000Z");

    const next = calculateManualMembershipExpireAt(currentExpireAt, -30, now);

    expect(next.toISOString()).toBe("2026-04-12T00:14:53.000Z");
  });

  it("rejects negative adjustment when membership does not exist", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");

    expect(() => calculateManualMembershipExpireAt(null, -30, now)).toThrow(
      "Không thể trừ ngày cho membership chưa tồn tại.",
    );
  });
});
