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
  source: "PAID" | "TRIAL";
  status: "ACTIVE" | "EXPIRED";
  createdAt: string;
  expireAt: string;
  lastError: string | null;
  removeRetries: number;
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
  activeVipCount: number;
  expiringTodayCount: number;
  monthlyRevenue: number;
};
