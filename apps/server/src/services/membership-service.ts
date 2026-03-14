import {
  MembershipSource,
  MembershipStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { env } from "../config.js";
import { calculateExtendedExpiry } from "../lib/billing.js";
import { prisma } from "../prisma.js";
import { PlatformKey, fromPrismaPlatform, legacyUserIdFor, toPrismaPlatform } from "./platform.js";

type MembershipScope = {
  platform: PlatformKey;
  platformUserId: string;
  platformChatId: string;
};

type MembershipIdentity = MembershipScope & {
  legacyUserId: string;
  roleId: string;
};

export function calculateManualMembershipExpireAt(
  currentExpireAt: Date | null,
  durationDays: number,
  now: Date,
) {
  if (durationDays < 0) {
    if (!currentExpireAt) {
      throw new Error("Không thể trừ ngày cho membership chưa tồn tại.");
    }
    return new Date(currentExpireAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  return calculateExtendedExpiry(currentExpireAt, durationDays, now);
}

export class MembershipService {
  private resolveRoleId(platform: PlatformKey, platformChatId: string) {
    return platform === "telegram" ? platformChatId : env.DISCORD_VIP_ROLE_ID;
  }

  private toIdentity(scope: MembershipScope): MembershipIdentity {
    return {
      ...scope,
      legacyUserId: legacyUserIdFor(scope.platform, scope.platformUserId),
      roleId: this.resolveRoleId(scope.platform, scope.platformChatId),
    };
  }

  async backfillPlatformColumns() {
    await prisma.$executeRawUnsafe(
      'UPDATE "Order" SET "platform" = \'DISCORD\', "platformUserId" = "discordUserId", "platformChatId" = "guildId" WHERE "platformUserId" IS NULL',
    );
    await prisma.$executeRawUnsafe(
      'UPDATE "Membership" SET "platform" = \'DISCORD\', "platformUserId" = "discordUserId", "platformChatId" = "guildId" WHERE "platformUserId" IS NULL',
    );
    await prisma.$executeRawUnsafe(
      'UPDATE "TrialClaim" SET "platform" = \'DISCORD\', "platformUserId" = "discordUserId" WHERE "platformUserId" IS NULL',
    );
  }

  async getActiveMembership(scope: MembershipScope) {
    const identity = this.toIdentity(scope);
    return prisma.membership.findUnique({
      where: {
        discordUserId_guildId_roleId: {
          discordUserId: identity.legacyUserId,
          guildId: identity.platformChatId,
          roleId: identity.roleId,
        },
      },
    });
  }

  async applyPaidOrder(input: {
    orderId: string;
    platform: PlatformKey;
    platformUserId: string;
    platformChatId: string;
    amount: number;
    durationDays: number;
    providerTransactionId: string;
    transferContent: string;
    bankRef: string | null;
    payerName: string | null;
    raw: Prisma.InputJsonValue;
  }) {
    const now = new Date();
    const identity = this.toIdentity({
      platform: input.platform,
      platformUserId: input.platformUserId,
      platformChatId: input.platformChatId,
    });

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { plan: true },
      });

      if (!order) {
        throw new Error("Order không tồn tại.");
      }

      if (order.status === OrderStatus.PAID) {
        const existingPayment = await tx.payment.findUnique({
          where: { providerTransactionId: input.providerTransactionId },
        });

        return {
          order,
          membership: await tx.membership.findUnique({
            where: {
              discordUserId_guildId_roleId: {
                discordUserId: identity.legacyUserId,
                guildId: identity.platformChatId,
                roleId: identity.roleId,
              },
            },
          }),
          payment: existingPayment,
          duplicate: true,
        };
      }

      const currentMembership = await tx.membership.findUnique({
        where: {
          discordUserId_guildId_roleId: {
            discordUserId: identity.legacyUserId,
            guildId: identity.platformChatId,
            roleId: identity.roleId,
          },
        },
      });

      const newExpireAt = calculateManualMembershipExpireAt(
        currentMembership?.expireAt ?? null,
        input.durationDays,
        now,
      );

      const membership = currentMembership
        ? await tx.membership.update({
            where: {
              discordUserId_guildId_roleId: {
                discordUserId: identity.legacyUserId,
                guildId: identity.platformChatId,
                roleId: identity.roleId,
              },
            },
            data: {
              platform: toPrismaPlatform(input.platform),
              platformUserId: input.platformUserId,
              platformChatId: input.platformChatId,
              source: MembershipSource.PAID,
              status: MembershipStatus.ACTIVE,
              startAt: currentMembership.expireAt > now ? currentMembership.startAt : now,
              expireAt: newExpireAt,
              removeRetries: 0,
              lastError: null,
            },
          })
        : await tx.membership.create({
            data: {
              discordUserId: identity.legacyUserId,
              guildId: identity.platformChatId,
              roleId: identity.roleId,
              platform: toPrismaPlatform(input.platform),
              platformUserId: input.platformUserId,
              platformChatId: input.platformChatId,
              source: MembershipSource.PAID,
              status: MembershipStatus.ACTIVE,
              startAt: now,
              expireAt: newExpireAt,
            },
          });

      const payment = await tx.payment.upsert({
        where: {
          providerTransactionId: input.providerTransactionId,
        },
        update: {
          amount: input.amount,
          bankRef: input.bankRef,
          transferContent: input.transferContent,
          payerName: input.payerName,
          status: PaymentStatus.MATCHED,
          raw: input.raw,
          orderId: order.id,
          matchedAt: now,
        },
        create: {
          providerTransactionId: input.providerTransactionId,
          amount: input.amount,
          bankRef: input.bankRef,
          transferContent: input.transferContent,
          payerName: input.payerName,
          status: PaymentStatus.MATCHED,
          raw: input.raw,
          orderId: order.id,
          matchedAt: now,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: now,
        },
      });

      return { order, membership, payment, duplicate: false };
    });
  }

  async createPendingPayment(input: {
    providerTransactionId: string;
    amount: number;
    transferContent: string;
    bankRef: string | null;
    payerName: string | null;
    raw: Prisma.InputJsonValue;
  }) {
    return prisma.payment.upsert({
      where: {
        providerTransactionId: input.providerTransactionId,
      },
      update: {
        amount: input.amount,
        transferContent: input.transferContent,
        bankRef: input.bankRef,
        payerName: input.payerName,
        raw: input.raw,
        status: PaymentStatus.PENDING_REVIEW,
      },
      create: {
        providerTransactionId: input.providerTransactionId,
        amount: input.amount,
        transferContent: input.transferContent,
        bankRef: input.bankRef,
        payerName: input.payerName,
        raw: input.raw,
        status: PaymentStatus.PENDING_REVIEW,
      },
    });
  }

  async grantTrial(scope: MembershipScope) {
    const identity = this.toIdentity(scope);
    const now = new Date();
    const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const cooldownStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingClaim = await tx.trialClaim.findFirst({
        where: {
          platform: toPrismaPlatform(scope.platform),
          OR: [{ platformUserId: scope.platformUserId }, { discordUserId: identity.legacyUserId }],
        },
      });

      if (existingClaim && existingClaim.claimedAt > cooldownStart) {
        throw new Error("Tài khoản này đã dùng trial VIP trong 30 ngày gần đây.");
      }

      if (existingClaim) {
        await tx.trialClaim.update({
          where: { id: existingClaim.id },
          data: {
            claimedAt: now,
            platform: toPrismaPlatform(scope.platform),
            platformUserId: scope.platformUserId,
            discordUserId: identity.legacyUserId,
          },
        });
      } else {
        await tx.trialClaim.create({
          data: {
            discordUserId: identity.legacyUserId,
            platform: toPrismaPlatform(scope.platform),
            platformUserId: scope.platformUserId,
            claimedAt: now,
          },
        });
      }

      const existingMembership = await tx.membership.findUnique({
        where: {
          discordUserId_guildId_roleId: {
            discordUserId: identity.legacyUserId,
            guildId: identity.platformChatId,
            roleId: identity.roleId,
          },
        },
      });

      return existingMembership
        ? tx.membership.update({
            where: {
              discordUserId_guildId_roleId: {
                discordUserId: identity.legacyUserId,
                guildId: identity.platformChatId,
                roleId: identity.roleId,
              },
            },
            data: {
              platform: toPrismaPlatform(scope.platform),
              platformUserId: scope.platformUserId,
              platformChatId: scope.platformChatId,
              source: MembershipSource.TRIAL,
              status: MembershipStatus.ACTIVE,
              startAt: now,
              expireAt,
              removeRetries: 0,
              lastError: null,
            },
          })
        : tx.membership.create({
            data: {
              discordUserId: identity.legacyUserId,
              guildId: identity.platformChatId,
              roleId: identity.roleId,
              platform: toPrismaPlatform(scope.platform),
              platformUserId: scope.platformUserId,
              platformChatId: scope.platformChatId,
              source: MembershipSource.TRIAL,
              status: MembershipStatus.ACTIVE,
              startAt: now,
              expireAt,
            },
          });
    });
  }

  async adjustManualMembership(input: {
    platform: PlatformKey;
    platformUserId: string;
    platformChatId: string;
    durationDays: number;
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) =>
      this.adjustManualMembershipInTransaction(tx, input),
    );
  }

  async adjustManualMembershipInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      platform: PlatformKey;
      platformUserId: string;
      platformChatId: string;
      durationDays: number;
    },
  ) {
    const now = new Date();
    const identity = this.toIdentity({
      platform: input.platform,
      platformUserId: input.platformUserId,
      platformChatId: input.platformChatId,
    });
    const currentMembership = await tx.membership.findUnique({
      where: {
        discordUserId_guildId_roleId: {
          discordUserId: identity.legacyUserId,
          guildId: identity.platformChatId,
          roleId: identity.roleId,
        },
      },
    });

    const newExpireAt = calculateManualMembershipExpireAt(
      currentMembership?.expireAt ?? null,
      input.durationDays,
      now,
    );

    if (input.durationDays < 0 && !currentMembership) {
      throw new Error("Người dùng này chưa có VIP để điều chỉnh.");
    }

    return currentMembership
      ? tx.membership.update({
          where: {
            discordUserId_guildId_roleId: {
              discordUserId: identity.legacyUserId,
              guildId: identity.platformChatId,
              roleId: identity.roleId,
            },
          },
          data: {
            platform: toPrismaPlatform(input.platform),
            platformUserId: input.platformUserId,
            platformChatId: input.platformChatId,
            source: currentMembership.source,
            status: newExpireAt > now ? MembershipStatus.ACTIVE : MembershipStatus.EXPIRED,
            startAt:
              input.durationDays > 0 && currentMembership.expireAt <= now
                ? now
                : currentMembership.startAt,
            expireAt: newExpireAt,
            removeRetries: 0,
            lastError: null,
          },
        })
      : tx.membership.create({
          data: {
            discordUserId: identity.legacyUserId,
            guildId: identity.platformChatId,
            roleId: identity.roleId,
            platform: toPrismaPlatform(input.platform),
            platformUserId: input.platformUserId,
            platformChatId: input.platformChatId,
            source: MembershipSource.MANUAL,
            status: MembershipStatus.ACTIVE,
            startAt: now,
            expireAt: newExpireAt,
          },
        });
  }

  async expireDueMemberships(limit = 20) {
    return prisma.membership.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        expireAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        expireAt: "asc",
      },
      take: limit,
    });
  }

  async listMembershipsNeedingReminder(thresholdDays: number, limit = 20) {
    const now = new Date();
    const upperThreshold = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);
    const lowerThreshold = new Date(now.getTime() + (thresholdDays - 1) * 24 * 60 * 60 * 1000);
    const reminderField =
      thresholdDays === 3 ? "reminded3dAt" : thresholdDays === 1 ? "reminded1dAt" : null;

    if (!reminderField) {
      throw new Error("Unsupported reminder threshold.");
    }

    return prisma.membership.findMany({
      where: {
        source: MembershipSource.PAID,
        status: MembershipStatus.ACTIVE,
        expireAt: {
          gt: lowerThreshold,
          lte: upperThreshold,
        },
        [reminderField]: null,
      },
      orderBy: {
        expireAt: "asc",
      },
      take: limit,
    });
  }

  async markReminderSent(membershipId: string, thresholdDays: number) {
    if (thresholdDays === 3) {
      return prisma.membership.update({
        where: { id: membershipId },
        data: { reminded3dAt: new Date() },
      });
    }

    if (thresholdDays === 1) {
      return prisma.membership.update({
        where: { id: membershipId },
        data: { reminded1dAt: new Date() },
      });
    }

    throw new Error("Unsupported reminder threshold.");
  }

  async markMembershipExpired(membershipId: string) {
    return prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: MembershipStatus.EXPIRED,
        lastError: null,
      },
    });
  }

  async markMembershipRemoveError(membershipId: string, message: string) {
    return prisma.membership.update({
      where: { id: membershipId },
      data: {
        removeRetries: {
          increment: 1,
        },
        lastError: message,
      },
    });
  }

  getMembershipTarget(membership: {
    platform: unknown;
    platformUserId: string | null;
    platformChatId: string | null;
    discordUserId: string;
    guildId: string;
  }): MembershipScope {
    const platform = fromPrismaPlatform(String(membership.platform ?? "DISCORD"));
    return {
      platform,
      platformUserId:
        membership.platformUserId ??
        (platform === "telegram"
          ? membership.discordUserId.replace(/^tg_/u, "")
          : membership.discordUserId),
      platformChatId: membership.platformChatId ?? membership.guildId,
    };
  }
}
