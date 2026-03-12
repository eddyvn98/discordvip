import { DiscordService } from "./discord-service.js";
import { AccessTarget, ManualReviewOrder, PlatformAdapter } from "./platform-adapter.js";

export class DiscordPlatformAdapter implements PlatformAdapter {
  readonly platform = "discord" as const;

  constructor(private readonly discordService: DiscordService) {}

  async start() {
    await this.discordService.start();
  }

  async grantAccess(target: AccessTarget) {
    await this.discordService.addVipRole(target.platformUserId);
  }

  async revokeAccess(target: AccessTarget) {
    await this.discordService.removeVipRole(target.platformUserId);
  }

  async sendVipActivatedNotice(target: AccessTarget, expireAt: Date) {
    await this.discordService.sendVipActivatedNotice(target.platformUserId, expireAt);
  }

  async sendVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    await this.discordService.sendVipExpiryReminder(target.platformUserId, expireAt, thresholdDays);
  }

  async sendAdminVipExpiryReminder(target: AccessTarget, expireAt: Date, thresholdDays: number) {
    await this.discordService.sendAdminVipExpiryReminder(target.platformUserId, expireAt, thresholdDays);
  }

  async sendAdminAutoPaymentConfirmedNotice(input: {
    target: AccessTarget;
    orderCode: string;
    amount: number;
    expireAt: Date;
    providerTransactionId: string;
  }) {
    await this.discordService.sendAdminAutoPaymentConfirmedNotice({
      discordUserId: input.target.platformUserId,
      orderCode: input.orderCode,
      amount: input.amount,
      expireAt: input.expireAt,
      providerTransactionId: input.providerTransactionId,
    });
  }

  async sendManualOrderReview(order: ManualReviewOrder) {
    await this.discordService.sendManualOrderReview({
      id: order.id,
      orderCode: order.orderCode,
      discordUserId: order.platformUserId,
      amount: order.amount,
      expiresAt: order.expiresAt,
      plan: order.plan,
    });
  }

  async isAdmin(platformUserId: string) {
    return this.discordService.memberHasAdminAccess(platformUserId);
  }
}

