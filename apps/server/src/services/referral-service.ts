import { MembershipService } from "./membership-service.js";
import { PlatformKey } from "./platform.js";
import { getInviteStats, registerJoinByToken, verifyAndReward } from "./referral/invite-flow.js";
import { getAdminSummary, reconcileIntegrity, redeemVipDays } from "./referral/redeem-and-admin.js";
import { ensureInviteToken, getReferralSettings } from "./referral/settings.js";

export class ReferralService {
  constructor(private readonly membershipService: MembershipService) {}

  async ensureInviteToken(input: {
    platform: PlatformKey;
    inviterUserId: string;
    inviterChatId?: string;
    inviteLink?: string;
  }) {
    return ensureInviteToken(input);
  }

  async getInviteStats(input: { platform: PlatformKey; inviterUserId: string }) {
    return getInviteStats(input);
  }

  async registerJoinByToken(input: {
    platform: PlatformKey;
    token: string;
    inviteeUserId: string;
    inviteeChatId?: string;
  }) {
    return registerJoinByToken(input);
  }

  async verifyAndReward(input: { platform: PlatformKey; inviteeUserId: string }) {
    return verifyAndReward(input);
  }

  async redeemVipDays(input: {
    platform: PlatformKey;
    userId: string;
    platformChatId: string;
    vipDays: number;
  }) {
    return redeemVipDays(this.membershipService, input);
  }

  async getAdminSummary() {
    return getAdminSummary();
  }

  async reconcileIntegrity(limit = 100) {
    return reconcileIntegrity(limit);
  }

  async getSettings() {
    return getReferralSettings();
  }
}
