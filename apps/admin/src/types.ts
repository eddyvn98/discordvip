export type AdminUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type SummaryResponse = {
  revenue: number;
  pendingCount: number;
  activeMemberships: number;
  guildId: string;
  recentPayments: TransactionItem[];
};

export type TransactionItem = {
  id: string;
  providerTransactionId: string;
  amount: number;
  transferContent: string | null;
  payerName: string | null;
  status: "MATCHED" | "PENDING_REVIEW" | "DUPLICATE";
  createdAt: string;
  order: null | {
    id: string;
    orderCode: string;
    platform: "discord" | "telegram";
    platformUserId: string;
    platformChatId: string | null;
    discordUserId: string;
    discordDisplayName?: string | null;
    plan: {
      code: string;
      name: string;
      amount: number;
      durationDays: number;
    };
  };
};

export type MembershipItem = {
  id: string;
  platform: "discord" | "telegram";
  platformUserId: string;
  platformChatId: string | null;
  discordUserId: string;
  discordDisplayName?: string | null;
  source: "PAID" | "TRIAL" | "MANUAL";
  status: "ACTIVE" | "EXPIRED";
  createdAt: string;
  expireAt: string;
  lastError: string | null;
  removeRetries: number;
};

export type DiscordLookupResult = {
  id: string;
  username: string;
  globalName: string | null;
  discriminator: string;
  displayName: string;
  inGuild: boolean;
};

export type PendingItem = {
  id: string;
  providerTransactionId: string;
  amount: number;
  transferContent: string | null;
  payerName: string | null;
  createdAt: string;
};

export type PendingOrderItem = {
  id: string;
  platform: "discord" | "telegram";
  platformUserId: string;
  platformChatId: string | null;
  orderCode: string;
  discordUserId: string;
  discordDisplayName?: string | null;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
  plan: {
    code: string;
    name: string;
    amount: number;
    durationDays: number;
  };
};

export type OrderSearchItem = {
  id: string;
  platform: "discord" | "telegram";
  platformUserId: string;
  platformChatId: string | null;
  orderCode: string;
  discordUserId: string;
  discordDisplayName?: string | null;
  amount: number;
  status: string;
  plan: {
    name: string;
  };
};

export type VipStatsResponse = {
  expiringSoonDays: number;
  platforms: Array<{
    platform: "discord" | "telegram";
    label: string;
    activeTotal: number;
    trialActiveCount: number;
    trialExpiringSoonCount: number;
    paidActiveCount: number;
    paidExpiringSoonCount: number;
    manualActiveCount: number;
    revenueReceivedTotal: number;
    revenueReceivedMonth: number;
    matchedPaymentCountTotal: number;
    matchedPaymentCountMonth: number;
    activePaidUserCount: number;
    activePaidMatchedUserCount: number;
    activePaidAlignedRevenue: number;
  }>;
};

export type PromoCodeItem = {
  id: string;
  code: string;
  label: string;
  durationDays: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePromoCodeInput = {
  code: string;
  label: string;
  durationDays: number;
  maxUses: number;
  expiresAt?: string | null;
  isActive: boolean;
};

export type UpdatePromoCodeInput = {
  label: string;
  durationDays: number;
  maxUses: number;
  expiresAt?: string | null;
  isActive: boolean;
};
