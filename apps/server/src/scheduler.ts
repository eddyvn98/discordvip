import { logger } from "./lib/logger.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";
import { PlatformRegistry } from "./services/platform-registry.js";

export function startSchedulers(
  membershipService: MembershipService,
  platformRegistry: PlatformRegistry,
  orderService: OrderService,
) {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

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

  const scheduleNext = (delayMs: number) => {
    if (stopped) {
      return;
    }

    timer = setTimeout(() => {
      void tick();
    }, delayMs);
  };

  const tick = async () => {
    const startedAt = Date.now();

    try {
      await run();
    } catch (error) {
      logger.error("Scheduler run failed", { error });
    } finally {
      const elapsedMs = Date.now() - startedAt;
      const nextDelayMs = Math.max(60_000 - elapsedMs, 5_000);
      scheduleNext(nextDelayMs);
    }
  };

  void tick();

  return {
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}
