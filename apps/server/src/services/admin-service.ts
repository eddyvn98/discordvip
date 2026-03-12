import { MembershipStatus, PaymentStatus } from "@prisma/client";

import { env } from "../config.js";
import { prisma } from "../prisma.js";
import { DiscordService } from "./discord-service.js";

export class AdminService {
  private readonly discordNameCache = new Map<string, { name: string; expiresAt: number }>();
  private readonly discordNameInflight = new Map<string, Promise<string | null>>();
  private static readonly DISCORD_NAME_CACHE_TTL_MS = 10 * 60 * 1000;
  private static readonly DISCORD_NAME_FETCH_TIMEOUT_MS = 1200;
  private static readonly DISCORD_NAME_FETCH_LIMIT = 40;
  private static readonly DISCORD_NAME_FETCH_CONCURRENCY = 8;

  constructor(private readonly discordService?: DiscordService) {}

  private getTodayRangeInVietnam() {
    const now = new Date();
    const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
    const vietnamNow = new Date(utcMillis + 7 * 60 * 60_000);

    const startVietnam = new Date(
      vietnamNow.getFullYear(),
      vietnamNow.getMonth(),
      vietnamNow.getDate(),
      0,
      0,
      0,
      0,
    );
    const endVietnam = new Date(
      vietnamNow.getFullYear(),
      vietnamNow.getMonth(),
      vietnamNow.getDate() + 1,
      0,
      0,
      0,
      0,
    );

    return {
      start: new Date(startVietnam.getTime() - 7 * 60 * 60_000),
      end: new Date(endVietnam.getTime() - 7 * 60 * 60_000),
    };
  }

  private getCurrentMonthRangeInVietnam() {
    const now = new Date();
    const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
    const vietnamNow = new Date(utcMillis + 7 * 60 * 60_000);

    const startVietnam = new Date(vietnamNow.getFullYear(), vietnamNow.getMonth(), 1, 0, 0, 0, 0);
    const endVietnam = new Date(vietnamNow.getFullYear(), vietnamNow.getMonth() + 1, 1, 0, 0, 0, 0);

    return {
      start: new Date(startVietnam.getTime() - 7 * 60 * 60_000),
      end: new Date(endVietnam.getTime() - 7 * 60 * 60_000),
    };
  }

  private formatDiscordDisplayName(user: {
    username: string;
    globalName: string | null;
    discriminator: string;
  }) {
    if (user.globalName) {
      return user.globalName;
    }

    if (user.discriminator && user.discriminator !== "0") {
      return `${user.username}#${user.discriminator}`;
    }

    return user.username;
  }

  private getCachedDiscordDisplayName(userId: string) {
    const cached = this.discordNameCache.get(userId);
    if (!cached) {
      return null;
    }
    if (cached.expiresAt <= Date.now()) {
      this.discordNameCache.delete(userId);
      return null;
    }
    return cached.name;
  }

  private setCachedDiscordDisplayName(userId: string, displayName: string) {
    this.discordNameCache.set(userId, {
      name: displayName,
      expiresAt: Date.now() + AdminService.DISCORD_NAME_CACHE_TTL_MS,
    });
  }

  private async fetchDiscordDisplayName(userId: string) {
    const cached = this.getCachedDiscordDisplayName(userId);
    if (cached) {
      return cached;
    }

    const inflight = this.discordNameInflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const fetchPromise = (async () => {
      try {
        const user = await Promise.race([
          this.discordService!.client.users.fetch(userId),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("discord_fetch_timeout")),
              AdminService.DISCORD_NAME_FETCH_TIMEOUT_MS,
            ),
          ),
        ]);
        const displayName = this.formatDiscordDisplayName(user);
        this.setCachedDiscordDisplayName(userId, displayName);
        return displayName;
      } catch {
        return null;
      } finally {
        this.discordNameInflight.delete(userId);
      }
    })();

    this.discordNameInflight.set(userId, fetchPromise);
    return fetchPromise;
  }

  private async resolveDiscordDisplayNames(userIds: string[]) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))].slice(
      0,
      AdminService.DISCORD_NAME_FETCH_LIMIT,
    );
    if (!uniqueUserIds.length || !this.discordService || !env.DISCORD_BOT_ENABLED) {
      return {} as Record<string, string>;
    }

    const records: Array<readonly [string, string | null]> = [];
    for (let i = 0; i < uniqueUserIds.length; i += AdminService.DISCORD_NAME_FETCH_CONCURRENCY) {
      const batch = uniqueUserIds.slice(i, i + AdminService.DISCORD_NAME_FETCH_CONCURRENCY);
      const batchRecords = await Promise.all(
        batch.map(async (userId) => {
          const displayName = await this.fetchDiscordDisplayName(userId);
          return [userId, displayName] as const;
        }),
      );
      records.push(...batchRecords);
    }

    return Object.fromEntries(
      records.filter((record): record is readonly [string, string] => Boolean(record[1])),
    );
  }

  async listTransactions() {
    const items = await prisma.payment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        order: {
          include: {
            plan: true,
          },
        },
      },
    });

    const namesById = await this.resolveDiscordDisplayNames(
      items.map((item) => item.order?.discordUserId ?? ""),
    );

    return items.map((item) => ({
      ...item,
      order: item.order
        ? {
            ...item.order,
            discordDisplayName: namesById[item.order.discordUserId] ?? null,
          }
        : null,
    }));
  }

  async listMemberships() {
    const items = await prisma.membership.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const namesById = await this.resolveDiscordDisplayNames(items.map((item) => item.discordUserId));
    return items.map((item) => ({
      ...item,
      discordDisplayName: namesById[item.discordUserId] ?? null,
    }));
  }

  async searchMemberships(query: string) {
    const normalized = query.trim().toLowerCase();
    const items = await this.listMemberships();

    return items
      .filter((item) => {
        const display = (item.discordDisplayName ?? "").toLowerCase();
        return (
          item.discordUserId.includes(query) ||
          item.status.toLowerCase().includes(normalized) ||
          item.source.toLowerCase().includes(normalized) ||
          display.includes(normalized)
        );
      })
      .slice(0, 100);
  }

  async revokeMembership(membershipId: string) {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new Error("Membership không tồn tại.");
    }

    if (membership.status === MembershipStatus.EXPIRED) {
      return membership;
    }

    if (!this.discordService) {
      throw new Error("Discord service chưa sẵn sàng.");
    }

    try {
      await this.discordService.removeVipRole(membership.discordUserId);
    } catch (error) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          removeRetries: { increment: 1 },
          lastError: error instanceof Error ? error.message : "Remove VIP role failed",
        },
      });
      throw new Error(
        error instanceof Error ? error.message : "Không thể gỡ role VIP trên Discord.",
      );
    }

    return prisma.membership.update({
      where: { id: membership.id },
      data: {
        status: MembershipStatus.EXPIRED,
        expireAt: new Date(),
        lastError: null,
      },
    });
  }

  async listPendingPayments() {
    return prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING_REVIEW,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }

  async deletePendingPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== PaymentStatus.PENDING_REVIEW) {
      throw new Error("Payment pending không tồn tại.");
    }

    await prisma.payment.delete({
      where: { id: payment.id },
    });
  }

  async listPendingOrders() {
    const items = await prisma.order.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        plan: true,
      },
    });

    const namesById = await this.resolveDiscordDisplayNames(items.map((item) => item.discordUserId));
    return items.map((item) => ({
      ...item,
      discordDisplayName: namesById[item.discordUserId] ?? null,
    }));
  }

  async searchOrders(query: string) {
    const items = await prisma.order.findMany({
      where: {
        OR: [
          {
            orderCode: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            discordUserId: {
              contains: query,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      include: {
        plan: true,
      },
    });

    const namesById = await this.resolveDiscordDisplayNames(items.map((item) => item.discordUserId));
    return items.map((item) => ({
      ...item,
      discordDisplayName: namesById[item.discordUserId] ?? null,
    }));
  }

  async getVipStats() {
    const todayRange = this.getTodayRangeInVietnam();
    const monthRange = this.getCurrentMonthRangeInVietnam();

    const [activeVipCount, expiringTodayCount, monthlyRevenueAgg] = await Promise.all([
      prisma.membership.count({
        where: {
          guildId: env.DISCORD_GUILD_ID,
          status: MembershipStatus.ACTIVE,
          expireAt: {
            gt: new Date(),
          },
        },
      }),
      prisma.membership.count({
        where: {
          guildId: env.DISCORD_GUILD_ID,
          status: MembershipStatus.ACTIVE,
          expireAt: {
            gte: todayRange.start,
            lt: todayRange.end,
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.MATCHED,
          createdAt: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
          order: {
            is: {
              guildId: env.DISCORD_GUILD_ID,
            },
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      activeVipCount,
      expiringTodayCount,
      monthlyRevenue: monthlyRevenueAgg._sum.amount ?? 0,
    };
  }
}
