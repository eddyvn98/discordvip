import { MembershipStatus, PaymentStatus } from "@prisma/client";

import { env } from "../config.js";
import { prisma } from "../prisma.js";
import { DiscordService } from "./discord-service.js";
import { PlatformRegistry } from "./platform-registry.js";
import { fromPrismaPlatform } from "./platform.js";

type PlatformFilter = "discord" | "telegram" | "all";

function toPlatformFilter(value: string | undefined): PlatformFilter {
  if (value === "telegram") {
    return "telegram";
  }
  if (value === "all") {
    return "all";
  }
  return "discord";
}

export class AdminService {
  private readonly discordNameCache = new Map<string, { name: string; expiresAt: number }>();
  private readonly discordNameInflight = new Map<string, Promise<string | null>>();
  private static readonly DISCORD_NAME_CACHE_TTL_MS = 10 * 60 * 1000;
  private static readonly DISCORD_NAME_FETCH_TIMEOUT_MS = 3000;
  private static readonly DISCORD_NAME_FETCH_CONCURRENCY = 8;

  constructor(
    private readonly discordService?: DiscordService,
    private readonly platformRegistry?: PlatformRegistry,
  ) {}

  private mapPlatformWhere(platform: PlatformFilter) {
    if (platform === "all") {
      return {};
    }
    return { platform: platform === "telegram" ? "TELEGRAM" : "DISCORD" } as const;
  }

  private mapMembershipWhere(platform: PlatformFilter) {
    if (platform === "discord") {
      return {
        ...this.mapPlatformWhere(platform),
        guildId: env.DISCORD_GUILD_ID,
      };
    }

    return this.mapPlatformWhere(platform);
  }

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
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
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

  private decorateUserIdentity(item: {
    platform: unknown;
    platformUserId: string | null;
    discordUserId: string;
  }) {
    const platform = fromPrismaPlatform(String(item.platform ?? "DISCORD"));
    const platformUserId =
      item.platformUserId ??
      (platform === "telegram" ? item.discordUserId.replace(/^tg_/u, "") : item.discordUserId);
    return {
      platform,
      platformUserId,
    };
  }

  async listTransactions(platformQuery?: string) {
    const platform = toPlatformFilter(platformQuery);
    const items = await prisma.payment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      where:
        platform === "all"
          ? undefined
          : {
              order: {
                is: this.mapPlatformWhere(platform),
              },
            },
      include: {
        order: {
          include: {
            plan: true,
          },
        },
      },
    });

    const namesById = await this.resolveDiscordDisplayNames(
      items
        .map((item) => {
          const order = item.order;
          if (!order) {
            return "";
          }
          const identity = this.decorateUserIdentity(order);
          return identity.platform === "discord" ? identity.platformUserId : "";
        })
        .filter(Boolean),
    );

    return items.map((item) => {
      if (!item.order) {
        return item;
      }

      const identity = this.decorateUserIdentity(item.order);
      return {
        ...item,
        order: {
          ...item.order,
          platform: identity.platform,
          platformUserId: identity.platformUserId,
          platformChatId: item.order.platformChatId ?? item.order.guildId,
          discordDisplayName:
            identity.platform === "discord" ? namesById[identity.platformUserId] ?? null : null,
        },
      };
    });
  }

  async searchTransactions(query: string, platformQuery?: string) {
    const normalized = query.trim();
    const platform = toPlatformFilter(platformQuery);
    const baseWhere =
      platform === "all"
        ? {}
        : {
            order: {
              is: this.mapPlatformWhere(platform),
            },
          };

    const items = await prisma.payment.findMany({
      where: {
        ...baseWhere,
        OR: [
          {
            providerTransactionId: {
              contains: normalized,
              mode: "insensitive",
            },
          },
          {
            transferContent: {
              contains: normalized,
              mode: "insensitive",
            },
          },
          {
            payerName: {
              contains: normalized,
              mode: "insensitive",
            },
          },
          {
            order: {
              is: {
                ...this.mapPlatformWhere(platform),
                OR: [
                  {
                    orderCode: {
                      contains: normalized,
                      mode: "insensitive",
                    },
                  },
                  {
                    discordUserId: {
                      contains: normalized,
                    },
                  },
                  {
                    platformUserId: {
                      contains: normalized,
                    },
                  },
                  {
                    plan: {
                      name: {
                        contains: normalized,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    plan: {
                      code: {
                        contains: normalized,
                        mode: "insensitive",
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
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
      items
        .map((item) => {
          const order = item.order;
          if (!order) {
            return "";
          }
          const identity = this.decorateUserIdentity(order);
          return identity.platform === "discord" ? identity.platformUserId : "";
        })
        .filter(Boolean),
    );

    return items.map((item) => {
      if (!item.order) {
        return item;
      }

      const identity = this.decorateUserIdentity(item.order);
      return {
        ...item,
        order: {
          ...item.order,
          platform: identity.platform,
          platformUserId: identity.platformUserId,
          platformChatId: item.order.platformChatId ?? item.order.guildId,
          discordDisplayName:
            identity.platform === "discord" ? namesById[identity.platformUserId] ?? null : null,
        },
      };
    });
  }

  async listMemberships(platformQuery?: string, includeNames = true) {
    const platform = toPlatformFilter(platformQuery);
    const items = await prisma.membership.findMany({
      where: this.mapMembershipWhere(platform),
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const namesById = includeNames
      ? await this.resolveDiscordDisplayNames(
          items
            .map((item) => {
              const identity = this.decorateUserIdentity(item);
              return identity.platform === "discord" ? identity.platformUserId : "";
            })
            .filter(Boolean),
        )
      : ({} as Record<string, string>);

    return items.map((item) => {
      const identity = this.decorateUserIdentity(item);
      return {
        ...item,
        platform: identity.platform,
        platformUserId: identity.platformUserId,
        platformChatId: item.platformChatId ?? item.guildId,
        discordDisplayName:
          identity.platform === "discord" ? namesById[identity.platformUserId] ?? null : null,
      };
    });
  }

  async getMembershipsMeta(platformQuery?: string) {
    const platform = toPlatformFilter(platformQuery);
    const where = this.mapMembershipWhere(platform);
    const [count, latest] = await Promise.all([
      prisma.membership.count({ where }),
      prisma.membership.findFirst({
        where,
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return {
      count,
      latestUpdatedAt: latest?.updatedAt ?? null,
    };
  }

  async searchMemberships(query: string, platformQuery?: string, includeNames = true) {
    const normalized = query.trim().toLowerCase();
    const knownStatus = new Set(["active", "expired"]);
    const knownSource = new Set(["paid", "trial"]);
    const platform = toPlatformFilter(platformQuery);
    const items = await prisma.membership.findMany({
      where: this.mapMembershipWhere(platform),
      orderBy: {
        createdAt: "desc",
      },
    });

    const namesById = includeNames
      ? await this.resolveDiscordDisplayNames(
          items
            .map((item) => {
              const identity = this.decorateUserIdentity(item);
              return identity.platform === "discord" ? identity.platformUserId : "";
            })
            .filter(Boolean),
        )
      : ({} as Record<string, string>);

    return items
      .filter((item) => {
        const identity = this.decorateUserIdentity(item);
        const display =
          identity.platform === "discord"
            ? (namesById[identity.platformUserId] ?? "").toLowerCase()
            : "";
        const statusText = item.status.toLowerCase();
        const sourceText = item.source.toLowerCase();
        const statusMatch = knownStatus.has(normalized)
          ? statusText === normalized
          : statusText.includes(normalized);
        const sourceMatch = knownSource.has(normalized)
          ? sourceText === normalized
          : sourceText.includes(normalized);
        return (
          item.discordUserId.includes(query) ||
          identity.platformUserId.includes(query) ||
          statusMatch ||
          sourceMatch ||
          display.includes(normalized)
        );
      })
      .map((item) => {
        const identity = this.decorateUserIdentity(item);
        return {
          ...item,
          platform: identity.platform,
          platformUserId: identity.platformUserId,
          platformChatId: item.platformChatId ?? item.guildId,
          discordDisplayName:
            identity.platform === "discord" ? namesById[identity.platformUserId] ?? null : null,
        };
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

    const identity = this.decorateUserIdentity(membership);
    const adapter = this.platformRegistry?.get(identity.platform);

    if (!adapter) {
      throw new Error("Platform service chưa sẵn sàng.");
    }

    try {
      await adapter.revokeAccess({
        platform: identity.platform,
        platformUserId: identity.platformUserId,
        platformChatId: membership.platformChatId ?? membership.guildId,
      });
    } catch (error) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          removeRetries: { increment: 1 },
          lastError: error instanceof Error ? error.message : "Remove VIP access failed",
        },
      });
      throw new Error(error instanceof Error ? error.message : "Không thể thu hồi VIP.");
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

  async listPendingOrders(platformQuery?: string) {
    const platform = toPlatformFilter(platformQuery);
    const items = await prisma.order.findMany({
      where: {
        ...this.mapPlatformWhere(platform),
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

    const namesById = await this.resolveDiscordDisplayNames(
      items
        .map((item) => {
          const identity = this.decorateUserIdentity(item);
          return identity.platform === "discord" ? identity.platformUserId : "";
        })
        .filter(Boolean),
    );

    return items.map((item) => {
      const identity = this.decorateUserIdentity(item);
      return {
        ...item,
        platform: identity.platform,
        platformUserId: identity.platformUserId,
        platformChatId: item.platformChatId ?? item.guildId,
        discordDisplayName:
          identity.platform === "discord" ? namesById[identity.platformUserId] ?? null : null,
      };
    });
  }

  async searchOrders(query: string, platformQuery?: string) {
    const platform = toPlatformFilter(platformQuery);
    const items = await prisma.order.findMany({
      where: {
        ...this.mapPlatformWhere(platform),
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
          {
            platformUserId: {
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

    const namesById = await this.resolveDiscordDisplayNames(
      items
        .map((item) => {
          const identity = this.decorateUserIdentity(item);
          return identity.platform === "discord" ? identity.platformUserId : "";
        })
        .filter(Boolean),
    );

    return items.map((item) => {
      const identity = this.decorateUserIdentity(item);
      return {
        ...item,
        platform: identity.platform,
        platformUserId: identity.platformUserId,
        platformChatId: item.platformChatId ?? item.guildId,
        discordDisplayName:
          identity.platform === "discord" ? namesById[identity.platformUserId] ?? null : null,
      };
    });
  }

  async getVipStats() {
    const todayRange = this.getTodayRangeInVietnam();
    const monthRange = this.getCurrentMonthRangeInVietnam();

    const [activeVipCount, expiringTodayCount, monthlyRevenueAgg] = await Promise.all([
      prisma.membership.count({
        where: {
          platform: "DISCORD",
          guildId: env.DISCORD_GUILD_ID,
          status: MembershipStatus.ACTIVE,
          expireAt: {
            gt: new Date(),
          },
        },
      }),
      prisma.membership.count({
        where: {
          platform: "DISCORD",
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
              platform: "DISCORD",
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
