import { ReferralEventStatus, ReferralPointSource } from "@prisma/client";

import { prisma } from "../../prisma.js";
import { PlatformKey, toPrismaPlatform } from "../platform.js";
import { getReferralSettings } from "./settings.js";

export async function getInviteStats(input: { platform: PlatformKey; inviterUserId: string }) {
  const platform = toPrismaPlatform(input.platform);
  const [successCount, joinedCount, pointsAgg] = await Promise.all([
    prisma.referralInviteEvent.count({
      where: { platform, inviterUserId: input.inviterUserId, status: ReferralEventStatus.SUCCESS },
    }),
    prisma.referralInviteEvent.count({
      where: { platform, inviterUserId: input.inviterUserId, status: ReferralEventStatus.JOINED },
    }),
    prisma.referralPointLedger.aggregate({
      where: { platform, userId: input.inviterUserId },
      _sum: { deltaPoints: true },
    }),
  ]);

  return {
    successCount,
    joinedCount,
    points: pointsAgg._sum.deltaPoints ?? 0,
  };
}

export async function registerJoinByToken(input: {
  platform: PlatformKey;
  token: string;
  inviteeUserId: string;
  inviteeChatId?: string;
}) {
  const normalizedToken = input.token.trim().toUpperCase();
  const inviteToken = await prisma.referralInviteToken.findUnique({
    where: { token: normalizedToken },
  });
  if (!inviteToken || !inviteToken.isActive) {
    return { ok: false as const, reason: "token_not_found" };
  }

  if (inviteToken.inviterUserId === input.inviteeUserId) {
    await prisma.referralInviteEvent.upsert({
      where: {
        platform_inviterUserId_inviteeUserId: {
          platform: inviteToken.platform,
          inviterUserId: inviteToken.inviterUserId,
          inviteeUserId: input.inviteeUserId,
        },
      },
      update: {
        status: ReferralEventStatus.FAILED,
        failedReason: "self_invite",
        inviteeChatId: input.inviteeChatId ?? null,
      },
      create: {
        platform: inviteToken.platform,
        inviterUserId: inviteToken.inviterUserId,
        inviteeUserId: input.inviteeUserId,
        inviterChatId: inviteToken.inviterChatId,
        inviteeChatId: input.inviteeChatId,
        inviteTokenId: inviteToken.id,
        status: ReferralEventStatus.FAILED,
        failedReason: "self_invite",
      },
    });
    return { ok: false as const, reason: "self_invite" };
  }

  const existing = await prisma.referralInviteEvent.findUnique({
    where: {
      platform_inviterUserId_inviteeUserId: {
        platform: inviteToken.platform,
        inviterUserId: inviteToken.inviterUserId,
        inviteeUserId: input.inviteeUserId,
      },
    },
  });

  if (existing?.status === ReferralEventStatus.SUCCESS) {
    return { ok: true as const, event: existing, inviterUserId: inviteToken.inviterUserId };
  }

  const event = existing
    ? await prisma.referralInviteEvent.update({
        where: { id: existing.id },
        data: {
          inviteeChatId: input.inviteeChatId ?? null,
          status: ReferralEventStatus.JOINED,
          failedReason: null,
        },
      })
    : await prisma.referralInviteEvent.create({
        data: {
          platform: inviteToken.platform,
          inviterUserId: inviteToken.inviterUserId,
          inviteeUserId: input.inviteeUserId,
          inviterChatId: inviteToken.inviterChatId,
          inviteeChatId: input.inviteeChatId,
          inviteTokenId: inviteToken.id,
          status: ReferralEventStatus.JOINED,
        },
      });

  return { ok: true as const, event, inviterUserId: inviteToken.inviterUserId };
}

export async function verifyAndReward(input: { platform: PlatformKey; inviteeUserId: string }) {
  const platform = toPrismaPlatform(input.platform);
  const latestJoined = await prisma.referralInviteEvent.findFirst({
    where: { platform, inviteeUserId: input.inviteeUserId },
    orderBy: { updatedAt: "desc" },
  });

  if (!latestJoined) {
    return { ok: false as const, reason: "join_not_found" };
  }
  if (latestJoined.status === ReferralEventStatus.SUCCESS) {
    return { ok: true as const, alreadyRewarded: true, inviterUserId: latestJoined.inviterUserId };
  }
  if (latestJoined.status === ReferralEventStatus.FAILED) {
    return { ok: false as const, reason: latestJoined.failedReason ?? "failed_event" };
  }

  const settings = await getReferralSettings();
  const points = settings.pointsPerSuccess;

  let awarded = false;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.referralInviteEvent.updateMany({
      where: {
        id: latestJoined.id,
        status: { not: ReferralEventStatus.SUCCESS },
      },
      data: {
        status: ReferralEventStatus.SUCCESS,
        verifiedAt: new Date(),
        failedReason: null,
        pointsAwarded: points,
      },
    });

    if (updated.count === 0) {
      return;
    }

    const existingAward = await tx.referralPointLedger.findFirst({
      where: {
        eventId: latestJoined.id,
        source: ReferralPointSource.INVITE_SUCCESS,
      },
      select: { id: true },
    });

    if (existingAward) {
      return;
    }

    await tx.referralPointLedger.create({
      data: {
        platform,
        userId: latestJoined.inviterUserId,
        eventId: latestJoined.id,
        source: ReferralPointSource.INVITE_SUCCESS,
        deltaPoints: points,
        note: `Invite success: ${latestJoined.inviteeUserId}`,
      },
    });
    awarded = true;
  });

  if (!awarded) {
    return { ok: true as const, alreadyRewarded: true, inviterUserId: latestJoined.inviterUserId };
  }

  return {
    ok: true as const,
    alreadyRewarded: false,
    inviterUserId: latestJoined.inviterUserId,
    pointsAwarded: points,
  };
}
