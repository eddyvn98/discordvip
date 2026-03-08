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
    discordUserId: string;
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
  discordUserId: string;
  source: "PAID" | "TRIAL";
  status: "ACTIVE" | "EXPIRED";
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

export type OrderSearchItem = {
  id: string;
  orderCode: string;
  discordUserId: string;
  amount: number;
  status: string;
  plan: {
    name: string;
  };
};
