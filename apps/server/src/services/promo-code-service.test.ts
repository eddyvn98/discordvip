import { describe, expect, it } from "vitest";

import {
  validatePromoCodeInput,
  validatePromoCodeUpdateInput,
} from "./promo-code-service.js";

describe("promo code validation", () => {
  it("normalizes the code and trims the label", () => {
    const result = validatePromoCodeInput({
      code: "  vip-march  ",
      label: "  Ma thang 3  ",
      durationDays: 30,
      maxUses: 100,
    });

    expect(result).toEqual({
      code: "VIP-MARCH",
      label: "Ma thang 3",
      durationDays: 30,
      maxUses: 100,
    });
  });

  it("rejects non-positive durationDays", () => {
    expect(() =>
      validatePromoCodeInput({
        code: "VIP",
        label: "Promo",
        durationDays: 0,
        maxUses: 1,
      }),
    ).toThrow("durationDays phải là số nguyên dương.");
  });

  it("rejects non-positive maxUses", () => {
    expect(() =>
      validatePromoCodeInput({
        code: "VIP",
        label: "Promo",
        durationDays: 7,
        maxUses: -1,
      }),
    ).toThrow("maxUses phải là số nguyên dương.");
  });

  it("rejects blank code", () => {
    expect(() =>
      validatePromoCodeInput({
        code: "   ",
        label: "Promo",
        durationDays: 7,
        maxUses: 1,
      }),
    ).toThrow("Mã khuyến mãi là bắt buộc.");
  });

  it("rejects blank label on update", () => {
    expect(() =>
      validatePromoCodeUpdateInput({
        label: "   ",
        durationDays: 7,
        maxUses: 1,
      }),
    ).toThrow("Nhãn khuyến mãi là bắt buộc.");
  });
});
