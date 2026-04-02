import { describe, expect, it, vi } from "vitest";

import { routeTelegramUpdate } from "./telegram-update-router.js";

function createHandlers() {
  return {
    onDonate: vi.fn(async () => {}),
    onTrialVip: vi.fn(async () => {}),
    onVipStatus: vi.fn(async () => {}),
    onRedeemVip: vi.fn(async () => {}),
    onAdminStats: vi.fn(async () => {}),
    onAdminGrantVip: vi.fn(async () => {}),
    onAdminRevokeVip: vi.fn(async () => {}),
    onAdminAdjustReferralPoints: vi.fn(async () => {}),
    onReferralMenu: vi.fn(async () => {}),
    onReferralCreateLink: vi.fn(async () => {}),
    onReferralStats: vi.fn(async () => {}),
    onReferralRedeem: vi.fn(async () => {}),
    onReferralJoinByToken: vi.fn(async () => ({ ok: true })),
    onReferralVerify: vi.fn(async () => {}),
  };
}

describe("telegram pending input", () => {
  it("clears pending referral_days when user taps Home", async () => {
    const handlers = createHandlers();
    const sendMessage = vi.fn(async () => ({}));

    const baseInput = {
      handlers,
      adminTelegramIds: [] as string[],
      adminCommandsSynced: new Set<string>(),
      userCommandsSynced: new Set<string>(),
      getUserCommands: () => [],
      getAdminCommands: () => [],
      syncAdminCommandsForUser: vi.fn(async () => {}),
      syncUserCommandsForUser: vi.fn(async () => {}),
      sendMessage,
      getActiveDonatePlans: vi.fn(async () => []),
      isAdmin: vi.fn(async () => false),
      answerCallbackQuery: vi.fn(async () => {}),
    };

    await routeTelegramUpdate({
      ...baseInput,
      update: {
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: 111, type: "private" },
          from: { id: 222 },
          text: "?? Ð?i VIP (1 di?m = 1 ngày VIP)",
        },
      },
    });

    await routeTelegramUpdate({
      ...baseInput,
      update: {
        update_id: 2,
        message: {
          message_id: 2,
          chat: { id: 111, type: "private" },
          from: { id: 222 },
          text: "?? V? Home",
        },
      },
    });

    expect(handlers.onReferralRedeem).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(String(sendMessage.mock.calls[1][1])).toContain("BOT VIP");
  });
});
