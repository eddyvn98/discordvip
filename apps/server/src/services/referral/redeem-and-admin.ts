import { ReferralEventStatus, ReferralPointSource } from "@prisma/client";

import { prisma } from "../../prisma.js";
import { MembershipService } from "../membership-service.js";
import { PlatformKey, toPrismaPlatform } from "../platform.js";
import { getReferralSettings } from "./settings.js";

const MIN_POINTS_TO_REDEEM = 10;

export async function redeemVipDays(
  membershipService: MembershipService,
  input: {
    platform: PlatformKey;
    userId: string;
    platformChatId: string;
    vipDays: number;
  },
) {
  if (!Number.isInteger(input.vipDays) || input.vipDays <= 0) {
    throw new Error("So ngay VIP phai la so nguyen duong.");
  }

  const settings = await getReferralSettings();
  const pointsRequired = Math.ceil(input.vipDays / settings.daysPerPoint);
  const platform = toPrismaPlatform(input.platform);

  const balanceAgg = await prisma.referralPointLedger.aggregate({
    where: { platform, userId: input.userId },
    _sum: { deltaPoints: true },
  });
  const balance = balanceAgg._sum.deltaPoints ?? 0;
  if (balance < MIN_POINTS_TO_REDEEM) {
    throw new Error(`Ban can tich luy it nhat ${MIN_POINTS_TO_REDEEM} diem moi duoc doi VIP.`);
  }
  if (balance < pointsRequired) {
    throw new Error(`Ban khong du diem de doi ${input.vipDays} ngay VIP.`);
  }

  const membership = await prisma.$transaction(async (tx) => {
    await tx.referralPointLedger.create({
      data: {
        platform,
        userId: input.userId,
        source: ReferralPointSource.REDEEM_VIP,
        deltaPoints: -pointsRequired,
        note: `Redeem ${input.vipDays} VIP days`,
      },
    });
    const adjusted = await membershipService.adjustManualMembershipInTransaction(tx, {
      platform: input.platform,
      platformUserId: input.userId,
      platformChatId: input.platformChatId,
      durationDays: input.vipDays,
    });
    await tx.referralRedemption.create({
      data: {
        platform,
        userId: input.userId,
        pointsSpent: pointsRequired,
        vipDaysGranted: input.vipDays,
        membershipId: adjusted.id,
      },
    });
    return adjusted;
  });

  const nextBalanceAgg = await prisma.referralPointLedger.aggregate({
    where: { platform, userId: input.userId },
    _sum: { deltaPoints: true },
  });
  return {
    membership,
    pointsSpent: pointsRequired,
    balanceAfter: nextBalanceAgg._sum.deltaPoints ?? 0,
  };
}

export async function getAdminSummary() {
  const [eventsByStatus, topInviters, totalPoints, redemptions] = await Promise.all([
    prisma.referralInviteEvent.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.referralPointLedger.groupBy({
      by: ["platform", "userId"],
      _sum: { deltaPoints: true },
      orderBy: { _sum: { deltaPoints: "desc" } },
      take: 20,
    }),
    prisma.referralPointLedger.aggregate({ _sum: { deltaPoints: true } }),
    prisma.referralRedemption.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return {
    statusCounts: Object.fromEntries(eventsByStatus.map((item) => [item.status, item._count._all])),
    totalPointsInSystem: totalPoints._sum.deltaPoints ?? 0,
    leaderboard: topInviters.map((item) => ({
      platform: item.platform === "TELEGRAM" ? "telegram" : "discord",
      userId: item.userId,
      points: item._sum.deltaPoints ?? 0,
    })),
    redemptions,
  };
}

export async function reconcileIntegrity(limit = 100) {
  const setting = await getReferralSettings();
  const missingAward = await prisma.referralInviteEvent.findMany({
    where: {
      status: ReferralEventStatus.SUCCESS,
      pointsAwarded: 0,
    },
    take: limit,
  });

  if (!missingAward.length) {
    return { checked: 0, repaired: 0 };
  }

  let repaired = 0;
  for (const event of missingAward) {
    const exists = await prisma.referralPointLedger.findFirst({
      where: {
        eventId: event.id,
        source: ReferralPointSource.INVITE_SUCCESS,
      },
    });
    if (exists) {
      await prisma.referralInviteEvent.update({
        where: { id: event.id },
        data: { pointsAwarded: exists.deltaPoints },
      });
      repaired += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.referralPointLedger.create({
        data: {
          platform: event.platform,
          userId: event.inviterUserId,
          eventId: event.id,
          source: ReferralPointSource.INVITE_SUCCESS,
          deltaPoints: setting.pointsPerSuccess,
          note: `Reconcile invite success: ${event.inviteeUserId}`,
        },
      });
      await tx.referralInviteEvent.update({
        where: { id: event.id },
        data: { pointsAwarded: setting.pointsPerSuccess },
      });
    });
    repaired += 1;
  }

  return { checked: missingAward.length, repaired };
}
