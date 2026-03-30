import { PlatformKey } from "./platform.js";

export type AccessTarget = {
  platform: PlatformKey;
  platformUserId: string;
  platformChatId: string;
  planCode?: string;
};

export type ManualReviewOrder = {
  id: string;
  orderCode: string;
  platform: PlatformKey;
  platformUserId: string;
  platformChatId: string;
  amount: number;
  expiresAt: Date;
  plan: {
    name: string;
    durationDays: number;
  };
};

export interface PlatformAdapter {
  readonly platform: PlatformKey;
  start(): Promise<void>;
  grantAccess(target: AccessTarget): Promise<void>;
  revokeAccess(target: AccessTarget): Promise<void>;
  sendVipActivatedNotice(target: AccessTarget, expireAt: Date): Promise<void>;
  sendTrialExpiredNotice?(target: AccessTarget): Promise<void>;
  sendVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number): Promise<void>;
  sendAdminVipExpiryReminder(
    target: AccessTarget,
    expireAt: Date,
    thresholdDays: number,
  ): Promise<void>;
  sendAdminAutoPaymentConfirmedNotice(input: {
    target: AccessTarget;
    orderCode: string;
    amount: number;
    expireAt: Date;
    providerTransactionId: string;
  }): Promise<void>;
  sendManualOrderReview?(order: ManualReviewOrder): Promise<void>;
  clearPaymentPromptMessage?(input: { chatId: string; messageId: number }): Promise<void>;
  checkHealth?(): Promise<void>;
  sendOpsAlert?(message: string): Promise<void>;
  isAdmin(platformUserId: string): Promise<boolean>;
  createReferralInviteLink?(input: {
    inviterUserId: string;
    inviterChatId?: string;
    referralToken: string;
  }): Promise<string>;
  checkUserInCommunity?(input: {
    userId: string;
    chatId?: string;
  }): Promise<boolean>;
}
