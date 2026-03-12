import { logger } from "./lib/logger.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";
import { PlatformRegistry } from "./services/platform-registry.js";

export function startSchedulers(
  membershipService: MembershipService,
  platformRegistry: PlatformRegistry,
  orderService: OrderService,
) {
  const run = async () => {
    await orderService.markExpiredOrders();

    for (const thresholdDays of [3, 1]) {
      const membershipsToRemind = await membershipService.listMembershipsNeedingReminder(
        thresholdDays,
        20,
      );

      for (const membership of membershipsToRemind) {
        const target = membershipService.getMembershipTarget(membership);
        const adapter = platformRegistry.get(target.platform);

        try {
          await adapter.sendVipExpiryReminder(target, membership.expireAt, thresholdDays);
        } catch (error) {
          logger.warn("Failed to send VIP expiry DM", {
            membershipId: membership.id,
            platform: target.platform,
            thresholdDays,
            error,
          });
        }

        try {
          await adapter.sendAdminVipExpiryReminder(target, membership.expireAt, thresholdDays);
        } catch (error) {
          logger.warn("Failed to send VIP expiry admin reminder", {
            membershipId: membership.id,
            platform: target.platform,
            thresholdDays,
            error,
          });
        }

        await membershipService.markReminderSent(membership.id, thresholdDays);
      }
    }

    const dueMemberships = await membershipService.expireDueMemberships(20);

    for (const membership of dueMemberships) {
      const target = membershipService.getMembershipTarget(membership);
      const adapter = platformRegistry.get(target.platform);

      try {
        await adapter.revokeAccess(target);
        await membershipService.markMembershipExpired(membership.id);
        logger.info("Expired VIP membership removed", {
          membershipId: membership.id,
          platform: target.platform,
          userId: target.platformUserId,
        });
      } catch (error) {
        await membershipService.markMembershipRemoveError(
          membership.id,
          error instanceof Error ? error.message : "Unknown remove error",
        );
        logger.error("Failed to remove VIP role", {
          membershipId: membership.id,
          error,
        });
      }
    }
  };

  void run();
  return setInterval(() => {
    void run();
  }, 60_000);
}
