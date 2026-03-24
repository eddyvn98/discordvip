import { MembershipSource, MembershipStatus, PaymentStatus } from "@prisma/client";

import { env } from "../config.js";
import { prisma } from "../prisma.js";
import { DiscordService } from "./discord-service.js";
import { MembershipService } from "./membership-service.js";
import { PlatformRegistry } from "./platform-registry.js";
import { fromPrismaPlatform } from "./platform.js";

type PlatformFilter = "discord" | "telegram" | "all";
type PaidSourceDetail = "PAID_AUTO" | "PAID_MANUAL_ORDER" | "PAID_ADMIN_GRANT";

function classifyPaidSourceFromTxId(providerTransactionId: string | null | undefined): PaidSourceDetail {
  if (!providerTransactionId) {
    return "PAID_ADMIN_GRANT";
  }
  const txId = providerTransactionId.toLowerCase();
  if (txId.startsWith("manual_") || txId.startsWith("tx-form-")) {
    return "PAID_MANUAL_ORDER";
  }
  return "PAID_AUTO";
}

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
  private static readonly DISCORD_PROFILE_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
  private static readonly DISCORD_NAME_FETCH_TIMEOUT_MS = 3000;
  private static readonly DISCORD_NAME_FETCH_CONCURRENCY = 8;
  private static readonly TELEGRAM_VERIFY_TOKEN_TTL_MS = 10 * 60 * 1000;

  constructor(
    private readonly membershipService?: MembershipService,
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

  private getFutureRangeInDays(days: number) {
    const now = new Date();
    return {
      start: now,
      end: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
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

  private requireDiscordService() {
    if (!this.discordService || !env.DISCORD_BOT_ENABLED) {
      throw new Error("Discord bot chưa sẵn sàng.");
    }
    return this.discordService;
  }

  private requireMembershipService() {
    if (!this.membershipService) {
      throw new Error("Membership service chưa sẵn sàng.");
    }
    return this.membershipService;
  }

  private requirePlatformRegistry() {
    if (!this.platformRegistry) {
      throw new Error("Platform service chưa sẵn sàng.");
    }
    return this.platformRegistry;
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

  private isProfileStale(updatedAt: Date) {
    return Date.now() - updatedAt.getTime() > AdminService.DISCORD_PROFILE_STALE_AFTER_MS;
  }

  private async fetchDiscordProfilesByIds(userIds: string[]) {
    if (!userIds.length) {
      return new Map<string, { displayName: string; updatedAt: Date }>();
    }

    const profiles = await prisma.discordUserProfile.findMany({
      where: {
        discordUserId: {
          in: userIds,
        },
      },
      select: {
        discordUserId: true,
        displayName: true,
        updatedAt: true,
      },
    });

    return new Map(
      profiles.map((profile) => [
        profile.discordUserId,
        {
          displayName: profile.displayName,
          updatedAt: profile.updatedAt,
        },
      ]),
    );
  }

  private async upsertDiscordUserProfile(user: {
    id: string;
    username: string;
    globalName: string | null;
    discriminator: string;
    avatar: string | null;
  }) {
    const displayName = this.formatDiscordDisplayName(user);
    await prisma.discordUserProfile.upsert({
      where: { discordUserId: user.id },
      update: {
        username: user.username,
        globalName: user.globalName,
        discriminator: user.discriminator,
        avatar: user.avatar,
        displayName,
      },
      create: {
        discordUserId: user.id,
        username: user.username,
        globalName: user.globalName,
        discriminator: user.discriminator,
        avatar: user.avatar,
        displayName,
      },
    });

    this.setCachedDiscordDisplayName(user.id, displayName);
    return displayName;
  }

  private async fetchAndPersistDiscordDisplayName(userId: string) {
    const cached = this.getCachedDiscordDisplayName(userId);
    if (cached) {
      return cached;
    }

    if (!this.discordService || !env.DISCORD_BOT_ENABLED) {
      return null;
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

        return this.upsertDiscordUserProfile({
          id: user.id,
          username: user.username,
          globalName: user.globalName,
          discriminator: user.discriminator,
          avatar: user.avatar,
        });
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
    if (!uniqueUserIds.length) {
      return {} as Record<string, string>;
    }

    const profilesById = await this.fetchDiscordProfilesByIds(uniqueUserIds);
    const resolvedNames = new Map<string, string>();
    const refreshTargets: string[] = [];

    for (const userId of uniqueUserIds) {
      const cached = this.getCachedDiscordDisplayName(userId);
      if (cached) {
        resolvedNames.set(userId, cached);
        continue;
      }

      const profile = profilesById.get(userId);
      if (profile) {
        this.setCachedDiscordDisplayName(userId, profile.displayName);
        resolvedNames.set(userId, profile.displayName);
        if (this.isProfileStale(profile.updatedAt)) {
          refreshTargets.push(userId);
        }
        continue;
      }

      refreshTargets.push(userId);
    }

    if (!this.discordService || !env.DISCORD_BOT_ENABLED || !refreshTargets.length) {
      return Object.fromEntries(resolvedNames.entries());
    }

    const records: Array<readonly [string, string | null]> = [];
    for (let i = 0; i < refreshTargets.length; i += AdminService.DISCORD_NAME_FETCH_CONCURRENCY) {
      const batch = refreshTargets.slice(i, i + AdminService.DISCORD_NAME_FETCH_CONCURRENCY);
      const batchRecords = await Promise.all(
        batch.map(async (userId) => {
          const displayName = await this.fetchAndPersistDiscordDisplayName(userId);
          return [userId, displayName] as const;
        }),
      );
      records.push(...batchRecords);
    }

    for (const [userId, displayName] of records) {
      if (!displayName) {
        continue;
      }
      resolvedNames.set(userId, displayName);
    }

    return Object.fromEntries(resolvedNames.entries());
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

  private async buildLatestMatchedPaymentMapByUser(input: {
    platform?: "DISCORD" | "TELEGRAM";
    guildId?: string;
    discordUserIds: string[];
  }) {
    if (!input.discordUserIds.length) {
      return new Map<string, string>();
    }

    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.MATCHED,
        order: {
          is: {
            ...(input.platform ? { platform: input.platform } : {}),
            ...(input.guildId ? { guildId: input.guildId } : {}),
            discordUserId: {
              in: input.discordUserIds,
            },
          },
        },
      },
      select: {
        providerTransactionId: true,
        createdAt: true,
        order: {
          select: {
            discordUserId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const latestByUser = new Map<string, string>();
    for (const payment of payments) {
      const userId = payment.order?.discordUserId;
      if (!userId || latestByUser.has(userId)) {
        continue;
      }
      latestByUser.set(userId, payment.providerTransactionId);
    }

    return latestByUser;
  }

  private async annotateMembershipSourceDetails<T extends { source: MembershipSource; discordUserId: string }>(
    items: T[],
  ) {
    const paidUserIds = [...new Set(items.filter((item) => item.source === MembershipSource.PAID).map((item) => item.discordUserId))];
    const latestTxByUser = await this.buildLatestMatchedPaymentMapByUser({
      discordUserIds: paidUserIds,
    });

    return items.map((item) => {
      if (item.source !== MembershipSource.PAID) {
        return {
          ...item,
          sourceDetail: item.source,
        };
      }

      const providerTransactionId = latestTxByUser.get(item.discordUserId) ?? null;
      return {
        ...item,
        sourceDetail: classifyPaidSourceFromTxId(providerTransactionId),
      };
    });
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

    const mappedItems = items.map((item) => {
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

    return this.annotateMembershipSourceDetails(mappedItems);
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
    const knownSource = new Set(["paid", "trial", "manual"]);
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

    const mappedItems = items
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

    return this.annotateMembershipSourceDetails(mappedItems);
  }

  async lookupDiscordGuildMember(discordUserId: string) {
    const discordService = this.requireDiscordService();
    const member = await discordService.getGuildMember(discordUserId);
    const displayName = await this.upsertDiscordUserProfile({
      id: member.user.id,
      username: member.user.username,
      globalName: member.user.globalName,
      discriminator: member.user.discriminator,
      avatar: member.user.avatar,
    });

    return {
      id: member.id,
      username: member.user.username,
      globalName: member.user.globalName,
      discriminator: member.user.discriminator,
      displayName,
      inGuild: true,
    };
  }

  async adjustDiscordMembershipDuration(input: {
    discordUserId: string;
    durationDays: number;
    grantedBy?: string;
    grantedFrom?: "admin_web" | "discord_command";
  }) {
    const discordService = this.requireDiscordService();
    const membershipService = this.requireMembershipService();
    const platformRegistry = this.requirePlatformRegistry();

    await discordService.getGuildMember(input.discordUserId);

    const membership = await membershipService.adjustManualMembership({
      platform: "discord",
      platformUserId: input.discordUserId,
      platformChatId: env.DISCORD_GUILD_ID,
      durationDays: input.durationDays,
      sourceOverride: input.durationDays > 0 ? MembershipSource.PAID : undefined,
    });

    const target = membershipService.getMembershipTarget(membership);

    try {
      if (membership.status === MembershipStatus.ACTIVE && membership.expireAt > new Date()) {
        await platformRegistry.get("discord").grantAccess(target);
      } else {
        await platformRegistry.get("discord").revokeAccess(target);
      }
    } catch (error) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          lastError: error instanceof Error ? error.message : "Adjust access failed",
        },
      });
      throw new Error(
        error instanceof Error ? error.message : "Không thể điều chỉnh thời hạn VIP.",
      );
    }

    const profile = await this.lookupDiscordGuildMember(input.discordUserId);

    return {
      membership: {
        ...membership,
        platform: "discord" as const,
        platformUserId: input.discordUserId,
        platformChatId: env.DISCORD_GUILD_ID,
        discordDisplayName: profile.displayName,
      },
      audit: {
        grantedBy: input.grantedBy ?? null,
        grantedFrom: input.grantedFrom ?? null,
      },
    };
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

  async adjustMembershipById(input: { membershipId: string; durationDays: number }) {
    const membershipService = this.requireMembershipService();
    const platformRegistry = this.requirePlatformRegistry();

    const current = await prisma.membership.findUnique({
      where: { id: input.membershipId },
    });

    if (!current) {
      throw new Error("Membership không tồn tại.");
    }

    const identity = this.decorateUserIdentity(current);
    const updated = await membershipService.adjustManualMembership({
      platform: identity.platform,
      platformUserId: identity.platformUserId,
      platformChatId: current.platformChatId ?? current.guildId,
      durationDays: input.durationDays,
      sourceOverride: input.durationDays > 0 ? MembershipSource.PAID : undefined,
    });

    const target = membershipService.getMembershipTarget(updated);
    if (updated.status === MembershipStatus.ACTIVE && updated.expireAt > new Date()) {
      await platformRegistry.get(identity.platform).grantAccess(target);
    } else {
      await platformRegistry.get(identity.platform).revokeAccess(target);
    }

    return updated;
  }

  async revokeDiscordMembershipByUserId(discordUserId: string) {
    const membership = await prisma.membership.findFirst({
      where: {
        platform: "DISCORD",
        guildId: env.DISCORD_GUILD_ID,
        discordUserId,
        status: MembershipStatus.ACTIVE,
        expireAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        expireAt: "desc",
      },
    });

    if (!membership) {
      throw new Error("Người dùng này không có VIP đang hoạt động.");
    }

    return this.revokeMembership(membership.id);
  }

  async adjustTelegramMembershipDuration(input: { telegramUserId: string; durationDays: number }) {
    const membershipService = this.requireMembershipService();
    const platformRegistry = this.requirePlatformRegistry();

    const membership = await membershipService.adjustManualMembership({
      platform: "telegram",
      platformUserId: input.telegramUserId,
      platformChatId: env.TELEGRAM_VIP_CHAT_ID,
      durationDays: input.durationDays,
      sourceOverride: input.durationDays > 0 ? MembershipSource.PAID : undefined,
    });

    const target = membershipService.getMembershipTarget(membership);
    if (membership.status === MembershipStatus.ACTIVE && membership.expireAt > new Date()) {
      await platformRegistry.get("telegram").grantAccess(target);
    } else {
      await platformRegistry.get("telegram").revokeAccess(target);
    }

    return membership;
  }

  async revokeTelegramMembershipByUserId(telegramUserId: string) {
    const membership = await prisma.membership.findFirst({
      where: {
        platform: "TELEGRAM",
        platformUserId: telegramUserId,
        status: MembershipStatus.ACTIVE,
        expireAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        expireAt: "desc",
      },
    });

    if (!membership) {
      throw new Error("User Telegram này không có VIP đang hoạt động.");
    }

    return this.revokeMembership(membership.id);
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

  private async getAlignedPaidStats(input: {
    platform: "DISCORD" | "TELEGRAM";
    guildId?: string;
  }) {
    const activePaidUsers = await prisma.membership.findMany({
      where: {
        platform: input.platform,
        ...(input.guildId ? { guildId: input.guildId } : {}),
        status: MembershipStatus.ACTIVE,
        source: MembershipSource.PAID,
        expireAt: {
          gt: new Date(),
        },
      },
      distinct: ["discordUserId"],
      select: {
        discordUserId: true,
      },
    });

    const latestValidPayments = await Promise.all(
      activePaidUsers.map(async ({ discordUserId }) => {
        const payments = await prisma.payment.findMany({
          where: {
            status: PaymentStatus.MATCHED,
            order: {
              is: {
                platform: input.platform,
                ...(input.guildId ? { guildId: input.guildId } : {}),
                discordUserId,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            amount: true,
            providerTransactionId: true,
            transferContent: true,
            order: {
              select: {
                amount: true,
                orderCode: true,
              },
            },
          },
        });

        return (
          payments.find((payment) => {
            if (!payment.order) {
              return false;
            }

            const txId = payment.providerTransactionId.toLowerCase();
            const content = payment.transferContent?.toLowerCase() ?? "";
            const orderCode = payment.order.orderCode.toLowerCase();

            return (
              !txId.startsWith("manual_") &&
              !txId.startsWith("tx-form-") &&
              payment.amount === payment.order.amount &&
              content.includes(orderCode)
            );
          }) ?? null
        );
      }),
    );

    const matchedPayments = latestValidPayments.filter((payment): payment is NonNullable<typeof payment> => !!payment);

    return {
      activePaidUserCount: activePaidUsers.length,
      activePaidMatchedUserCount: matchedPayments.length,
      activePaidAlignedRevenue: matchedPayments.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }

  async getVipStats() {
    const todayRange = this.getTodayRangeInVietnam();
    const expiringSoonRange = this.getFutureRangeInDays(3);
    const monthRange = this.getCurrentMonthRangeInVietnam();
    const now = new Date();
    const buildPaidBreakdown = async (input: { platform: "DISCORD" | "TELEGRAM"; guildId?: string }) => {
      const paidMemberships = await prisma.membership.findMany({
        where: {
          platform: input.platform,
          ...(input.guildId ? { guildId: input.guildId } : {}),
          source: MembershipSource.PAID,
          status: MembershipStatus.ACTIVE,
          expireAt: {
            gt: now,
          },
        },
        select: {
          discordUserId: true,
        },
      });

      const latestTxByUser = await this.buildLatestMatchedPaymentMapByUser({
        platform: input.platform,
        guildId: input.guildId,
        discordUserIds: [...new Set(paidMemberships.map((item) => item.discordUserId))],
      });

      let paidAutoCount = 0;
      let paidManualOrderCount = 0;
      let paidAdminGrantCount = 0;

      for (const membership of paidMemberships) {
        const detail = classifyPaidSourceFromTxId(latestTxByUser.get(membership.discordUserId));
        if (detail === "PAID_AUTO") {
          paidAutoCount += 1;
        } else if (detail === "PAID_MANUAL_ORDER") {
          paidManualOrderCount += 1;
        } else {
          paidAdminGrantCount += 1;
        }
      }

      return {
        paidAutoCount,
        paidManualOrderCount,
        paidAdminGrantCount,
      };
    };

    const platforms = [
      {
        key: "discord" as const,
        label: "Discord",
        membershipWhere: {
          platform: "DISCORD" as const,
          guildId: env.DISCORD_GUILD_ID,
        },
        orderWhere: {
          platform: "DISCORD" as const,
          guildId: env.DISCORD_GUILD_ID,
        },
      },
      {
        key: "telegram" as const,
        label: "Telegram",
        membershipWhere: {
          platform: "TELEGRAM" as const,
        },
        orderWhere: {
          platform: "TELEGRAM" as const,
        },
      },
    ];

    const items = await Promise.all(
      platforms.map(async (platform) => {
        const activeWhere = {
          ...platform.membershipWhere,
          status: MembershipStatus.ACTIVE,
          expireAt: {
            gt: now,
          },
        };
        const expiringSoonWhere = {
          ...platform.membershipWhere,
          status: MembershipStatus.ACTIVE,
          expireAt: {
            gt: expiringSoonRange.start,
            lte: expiringSoonRange.end,
          },
        };

        const [
          activeTotal,
          trialActiveCount,
          trialExpiringSoonCount,
          paidActiveCount,
          paidExpiringSoonCount,
          manualActiveCount,
          revenueReceivedTotalAgg,
          revenueReceivedMonthAgg,
          matchedPaymentCountTotal,
          matchedPaymentCountMonth,
          alignedPaidStats,
          paidBreakdown,
        ] = await Promise.all([
          prisma.membership.count({
            where: activeWhere,
          }),
          prisma.membership.count({
            where: {
              ...activeWhere,
              source: MembershipSource.TRIAL,
            },
          }),
          prisma.membership.count({
            where: {
              ...expiringSoonWhere,
              source: MembershipSource.TRIAL,
            },
          }),
          prisma.membership.count({
            where: {
              ...activeWhere,
              source: MembershipSource.PAID,
            },
          }),
          prisma.membership.count({
            where: {
              ...expiringSoonWhere,
              source: MembershipSource.PAID,
            },
          }),
          prisma.membership.count({
            where: {
              ...activeWhere,
              source: MembershipSource.MANUAL,
            },
          }),
          prisma.payment.aggregate({
            where: {
              status: PaymentStatus.MATCHED,
              order: {
                is: platform.orderWhere,
              },
            },
            _sum: {
              amount: true,
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
                is: platform.orderWhere,
              },
            },
            _sum: {
              amount: true,
            },
          }),
          prisma.payment.count({
            where: {
              status: PaymentStatus.MATCHED,
              order: {
                is: platform.orderWhere,
              },
            },
          }),
          prisma.payment.count({
            where: {
              status: PaymentStatus.MATCHED,
              createdAt: {
                gte: monthRange.start,
                lt: monthRange.end,
              },
              order: {
                is: platform.orderWhere,
              },
            },
          }),
          this.getAlignedPaidStats({
            platform: platform.key === "telegram" ? "TELEGRAM" : "DISCORD",
            ...(platform.key === "discord" ? { guildId: env.DISCORD_GUILD_ID } : {}),
          }),
          buildPaidBreakdown({
            platform: platform.key === "telegram" ? "TELEGRAM" : "DISCORD",
            ...(platform.key === "discord" ? { guildId: env.DISCORD_GUILD_ID } : {}),
          }),
        ]);

        return {
          platform: platform.key,
          label: platform.label,
          activeTotal,
          trialActiveCount,
          trialExpiringSoonCount,
          paidActiveCount,
          paidExpiringSoonCount,
          manualActiveCount,
          revenueReceivedTotal: revenueReceivedTotalAgg._sum.amount ?? 0,
          revenueReceivedMonth: revenueReceivedMonthAgg._sum.amount ?? 0,
          matchedPaymentCountTotal,
          matchedPaymentCountMonth,
          activePaidUserCount: alignedPaidStats.activePaidUserCount,
          activePaidMatchedUserCount: alignedPaidStats.activePaidMatchedUserCount,
          activePaidAlignedRevenue: alignedPaidStats.activePaidAlignedRevenue,
          paidAutoCount: paidBreakdown.paidAutoCount,
          paidManualOrderCount: paidBreakdown.paidManualOrderCount,
          paidAdminGrantCount: paidBreakdown.paidAdminGrantCount,
        };
      }),
    );

    const discordStats = items.find((item) => item.platform === "discord");
    const expiringTodayCount =
      (await prisma.membership.count({
        where: {
          platform: "DISCORD",
          guildId: env.DISCORD_GUILD_ID,
          status: MembershipStatus.ACTIVE,
          expireAt: {
            gte: todayRange.start,
            lt: todayRange.end,
          },
        },
      })) ?? 0;

    return {
      expiringSoonDays: 3,
      platforms: items,
      activeVipCount: discordStats?.activeTotal ?? 0,
      expiringTodayCount,
      monthlyRevenue: discordStats?.revenueReceivedMonth ?? 0,
      alignedRevenue: discordStats?.activePaidAlignedRevenue ?? 0,
    };
  }

  async listPlans() {
    const plans = await prisma.plan.findMany({
      orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
    });

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      amount: plan.amount,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));
  }

  async createPlan(input: {
    code: string;
    name: string;
    amount: number;
    durationDays: number;
    isActive: boolean;
  }) {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    if (!code) {
      throw new Error("Mã plan là bắt buộc.");
    }
    if (!name) {
      throw new Error("Tên plan là bắt buộc.");
    }

    await prisma.plan.create({
      data: {
        code,
        name,
        amount: input.amount,
        durationDays: input.durationDays,
        isActive: input.isActive,
      },
    });

    return this.listPlans();
  }

  async updatePlan(
    id: string,
    input: {
      name: string;
      amount: number;
      durationDays: number;
      isActive: boolean;
    },
  ) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Tên plan là bắt buộc.");
    }

    await prisma.plan.update({
      where: { id },
      data: {
        name,
        amount: input.amount,
        durationDays: input.durationDays,
        isActive: input.isActive,
      },
    });

    return this.listPlans();
  }

  async deletePlan(id: string) {
    const [orderCount, mappingCount] = await Promise.all([
      prisma.order.count({ where: { planId: id } }),
      prisma.telegramPlanChannel.count({ where: { planId: id } }),
    ]);

    if (orderCount > 0) {
      await prisma.$transaction([
        prisma.plan.update({
          where: { id },
          data: { isActive: false },
        }),
        prisma.telegramPlanChannel.deleteMany({
          where: { planId: id },
        }),
      ]);
      return this.listPlans();
    }

    if (mappingCount > 0) {
      await prisma.telegramPlanChannel.deleteMany({
        where: { planId: id },
      });
    }

    await prisma.plan.delete({ where: { id } });
    return this.listPlans();
  }

  async getTelegramVipConfig() {
    const [plans, channels, verifications] = await Promise.all([
      prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { amount: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
      prisma.telegramVipChannel.findMany({
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
        include: {
          planMappings: {
            include: {
              plan: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      }),
      prisma.telegramChannelVerification.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 10,
      }),
    ]);

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
      })),
      channels: channels.map((channel) => ({
        id: channel.id,
        chatId: channel.chatId,
        title: channel.title,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
        updatedAt: channel.updatedAt.toISOString(),
        planCodes: channel.planMappings.map((mapping) => mapping.plan.code),
      })),
      verifications: verifications.map((item) => ({
        id: item.id,
        token: item.token,
        requestedBy: item.requestedBy,
        expiresAt: item.expiresAt.toISOString(),
        usedAt: item.usedAt ? item.usedAt.toISOString() : null,
        verifiedByTelegramUserId: item.verifiedByTelegramUserId,
        verifiedChatId: item.verifiedChatId,
        verifiedChatTitle: item.verifiedChatTitle,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  }

  async createTelegramChannelVerification(requestedBy: string) {
    const token = `VIP-VERIFY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + AdminService.TELEGRAM_VERIFY_TOKEN_TTL_MS);

    const verification = await prisma.telegramChannelVerification.create({
      data: {
        token,
        requestedBy,
        expiresAt,
      },
    });

    return {
      id: verification.id,
      token: verification.token,
      expiresAt: verification.expiresAt.toISOString(),
    };
  }

  async cleanupExpiredTelegramChannelVerifications() {
    const result = await prisma.telegramChannelVerification.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return {
      deletedCount: result.count,
    };
  }

  async confirmTelegramChannelVerification(input: {
    token: string;
    telegramUserId: string;
    chatId: string;
    chatTitle: string;
  }) {
    const normalizedToken = input.token.trim().toUpperCase();
    if (!normalizedToken.startsWith("VIP-VERIFY-")) {
      return { ok: false, reason: "invalid_token_format" as const };
    }

    const verification = await prisma.telegramChannelVerification.findUnique({
      where: { token: normalizedToken },
    });
    if (!verification) {
      return { ok: false, reason: "token_not_found" as const };
    }
    if (verification.usedAt) {
      return { ok: false, reason: "token_used" as const };
    }
    if (verification.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "token_expired" as const };
    }

    const title = input.chatTitle.trim() || `Telegram ${input.chatId}`;
    await prisma.$transaction([
      prisma.telegramChannelVerification.update({
        where: { id: verification.id },
        data: {
          usedAt: new Date(),
          verifiedByTelegramUserId: input.telegramUserId,
          verifiedChatId: input.chatId,
          verifiedChatTitle: title,
        },
      }),
      prisma.telegramVipChannel.upsert({
        where: { chatId: input.chatId },
        update: {
          title,
          isActive: true,
        },
        create: {
          chatId: input.chatId,
          title,
          isActive: true,
        },
      }),
    ]);

    return {
      ok: true,
      verificationId: verification.id,
      chatId: input.chatId,
      chatTitle: title,
    };
  }

  async upsertTelegramVipChannel(input: {
    id?: string;
    chatId: string;
    title: string;
    isActive: boolean;
    planCodes: string[];
  }) {
    const normalizedChatId = input.chatId.trim();
    const normalizedTitle = input.title.trim();
    const normalizedPlanCodes = [...new Set(input.planCodes.map((code) => code.trim().toUpperCase()))].filter(
      Boolean,
    );

    if (!normalizedChatId) {
      throw new Error("Chat ID là bắt buộc.");
    }

    if (!normalizedTitle) {
      throw new Error("Tên kênh là bắt buộc.");
    }

    const plans = await prisma.plan.findMany({
      where: {
        code: {
          in: normalizedPlanCodes,
        },
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (plans.length !== normalizedPlanCodes.length) {
      throw new Error("Có plan không hợp lệ trong cấu hình kênh Telegram.");
    }

    const channel = input.id
      ? await prisma.telegramVipChannel.update({
          where: { id: input.id },
          data: {
            chatId: normalizedChatId,
            title: normalizedTitle,
            isActive: input.isActive,
          },
        })
      : await prisma.telegramVipChannel.create({
          data: {
            chatId: normalizedChatId,
            title: normalizedTitle,
            isActive: input.isActive,
          },
        });

    await prisma.$transaction([
      prisma.telegramPlanChannel.deleteMany({
        where: {
          channelId: channel.id,
        },
      }),
      ...(plans.length
        ? [
            prisma.telegramPlanChannel.createMany({
              data: plans.map((plan) => ({
                planId: plan.id,
                channelId: channel.id,
              })),
            }),
          ]
        : []),
    ]);

    return this.getTelegramVipConfig();
  }

  async deleteTelegramVipChannel(channelId: string) {
    await prisma.telegramVipChannel.delete({
      where: {
        id: channelId,
      },
    });

    return this.getTelegramVipConfig();
  }
}
