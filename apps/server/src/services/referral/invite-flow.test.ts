import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockGetReferralSettings } = vi.hoisted(() => ({
  mockPrisma: {
    referralInviteEvent: {
      findFirst: vi.fn(),
    },
    referralPointLedger: {
      findFirst: vi.fn(),
    },
    referralVerifyLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockGetReferralSettings: vi.fn(async () => ({ pointsPerSuccess: 1 })),
}));

vi.mock("../../prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("./settings.js", () => ({
  getReferralSettings: mockGetReferralSettings,
}));

import { verifyAndReward } from "./invite-flow.js";

describe("verifyAndReward", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks JOINED event as SUCCESS and creates a single point ledger", async () => {
    const joinedEvent = {
      id: "evt_1",
      inviterUserId: "inviter_1",
      inviteeUserId: "invitee_1",
      status: "JOINED",
    };

    mockPrisma.referralInviteEvent.findFirst.mockResolvedValueOnce(joinedEvent);

    const tx = {
      referralInviteEvent: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      referralPointLedger: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "ledger_1" }),
      },
    };
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const result = await verifyAndReward({ platform: "telegram", inviteeUserId: "invitee_1" });

    expect(result).toEqual({
      ok: true,
      alreadyRewarded: false,
      inviterUserId: "inviter_1",
      pointsAwarded: 1,
    });
    expect(tx.referralInviteEvent.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.referralPointLedger.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.referralVerifyLog.create).toHaveBeenCalledTimes(1);
  });

  it("does not create duplicate ledger when reward already exists", async () => {
    const joinedEvent = {
      id: "evt_2",
      inviterUserId: "inviter_2",
      inviteeUserId: "invitee_2",
      status: "JOINED",
    };

    mockPrisma.referralInviteEvent.findFirst.mockResolvedValueOnce(joinedEvent);

    const tx = {
      referralInviteEvent: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      referralPointLedger: {
        findFirst: vi.fn().mockResolvedValue({ id: "existing_ledger" }),
        create: vi.fn(),
      },
    };
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx));

    const result = await verifyAndReward({ platform: "telegram", inviteeUserId: "invitee_2" });

    expect(result).toEqual({
      ok: true,
      alreadyRewarded: true,
      inviterUserId: "inviter_2",
    });
    expect(tx.referralPointLedger.create).not.toHaveBeenCalled();
  });
});
