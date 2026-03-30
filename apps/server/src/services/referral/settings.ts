import { customAlphabet } from "nanoid";

import { prisma } from "../../prisma.js";
import { PlatformKey, toPrismaPlatform } from "../platform.js";
import { TxClient } from "./types.js";

const generateReferralToken = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 12);
const REFERRAL_POINTS_PER_SUCCESS = 1;
const REFERRAL_DAYS_PER_POINT = 1;

export async function getReferralSettings(tx: TxClient = prisma) {
  const existing = await tx.referralSetting.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    if (
      existing.pointsPerSuccess !== REFERRAL_POINTS_PER_SUCCESS ||
      existing.daysPerPoint !== REFERRAL_DAYS_PER_POINT
    ) {
      return tx.referralSetting.update({
        where: { id: existing.id },
        data: {
          pointsPerSuccess: REFERRAL_POINTS_PER_SUCCESS,
          daysPerPoint: REFERRAL_DAYS_PER_POINT,
        },
      });
    }
    return existing;
  }
  return tx.referralSetting.create({
    data: {
      pointsPerSuccess: REFERRAL_POINTS_PER_SUCCESS,
      daysPerPoint: REFERRAL_DAYS_PER_POINT,
    },
  });
}

export async function ensureInviteToken(input: {
  platform: PlatformKey;
  inviterUserId: string;
  inviterChatId?: string;
  inviteLink?: string;
}) {
  const platform = toPrismaPlatform(input.platform);
  const existing = await prisma.referralInviteToken.findFirst({
    where: {
      platform,
      inviterUserId: input.inviterUserId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    if (input.inviteLink && existing.inviteLink !== input.inviteLink) {
      return prisma.referralInviteToken.update({
        where: { id: existing.id },
        data: {
          inviteLink: input.inviteLink,
          inviterChatId: input.inviterChatId ?? existing.inviterChatId,
        },
      });
    }
    return existing;
  }

  return prisma.referralInviteToken.create({
    data: {
      token: generateReferralToken(),
      platform,
      inviterUserId: input.inviterUserId,
      inviterChatId: input.inviterChatId,
      inviteLink: input.inviteLink,
    },
  });
}
