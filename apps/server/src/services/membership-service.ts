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

export class MembershipService {
  async getActiveMembership(discordUserId: string) {
    return prisma.membership.findUnique({
      where: {
        discordUserId_guildId_roleId: {
          discordUserId,
          guildId: env.DISCORD_GUILD_ID,
          roleId: env.DISCORD_VIP_ROLE_ID,
        },
      },
    });
  }

  async applyPaidOrder(input: {
    orderId: string;
    discordUserId: string;
    amount: number;
    durationDays: number;
    providerTransactionId: string;
    transferContent: string;
    bankRef: string | null;
    payerName: string | null;
    raw: Prisma.InputJsonValue;
  }) {
    const now = new Date();

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
                discordUserId: input.discordUserId,
                guildId: env.DISCORD_GUILD_ID,
                roleId: env.DISCORD_VIP_ROLE_ID,
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
            discordUserId: input.discordUserId,
            guildId: env.DISCORD_GUILD_ID,
            roleId: env.DISCORD_VIP_ROLE_ID,
          },
        },
      });

      const newExpireAt = calculateExtendedExpiry(
        currentMembership?.expireAt ?? null,
        input.durationDays,
        now,
      );

      const membership = currentMembership
        ? await tx.membership.update({
            where: {
              discordUserId_guildId_roleId: {
                discordUserId: input.discordUserId,
                guildId: env.DISCORD_GUILD_ID,
                roleId: env.DISCORD_VIP_ROLE_ID,
              },
            },
            data: {
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
              discordUserId: input.discordUserId,
              guildId: env.DISCORD_GUILD_ID,
              roleId: env.DISCORD_VIP_ROLE_ID,
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

  async grantTrial(discordUserId: string) {
    const now = new Date();
    const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const cooldownStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingClaim = await tx.trialClaim.findUnique({
        where: { discordUserId },
      });

      if (existingClaim && existingClaim.claimedAt > cooldownStart) {
        throw new Error("Tài khoản này đã dùng trial VIP trong 30 ngày gần đây.");
      }

      if (existingClaim) {
        await tx.trialClaim.update({
          where: { discordUserId },
          data: { claimedAt: now },
        });
      } else {
        await tx.trialClaim.create({
          data: { discordUserId, claimedAt: now },
        });
      }

      const existingMembership = await tx.membership.findUnique({
        where: {
          discordUserId_guildId_roleId: {
            discordUserId,
            guildId: env.DISCORD_GUILD_ID,
            roleId: env.DISCORD_VIP_ROLE_ID,
          },
        },
      });

      return existingMembership
        ? tx.membership.update({
            where: {
              discordUserId_guildId_roleId: {
                discordUserId,
                guildId: env.DISCORD_GUILD_ID,
                roleId: env.DISCORD_VIP_ROLE_ID,
              },
            },
            data: {
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
              discordUserId,
              guildId: env.DISCORD_GUILD_ID,
              roleId: env.DISCORD_VIP_ROLE_ID,
              source: MembershipSource.TRIAL,
              status: MembershipStatus.ACTIVE,
              startAt: now,
              expireAt,
            },
          });
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
    const threshold = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);
    const reminderField =
      thresholdDays === 3 ? "reminded3dAt" : thresholdDays === 1 ? "reminded1dAt" : null;

    if (!reminderField) {
      throw new Error("Unsupported reminder threshold.");
    }

    return prisma.membership.findMany({
      where: {
        guildId: env.DISCORD_GUILD_ID,
        roleId: env.DISCORD_VIP_ROLE_ID,
        status: MembershipStatus.ACTIVE,
        expireAt: {
          gt: now,
          lte: threshold,
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
}
