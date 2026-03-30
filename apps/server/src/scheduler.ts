import { logger } from "./lib/logger.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";
import { PlatformRegistry } from "./services/platform-registry.js";
import { ReferralService } from "./services/referral-service.js";

export function startSchedulers(
  membershipService: MembershipService,
  platformRegistry: PlatformRegistry,
  orderService: OrderService,
  referralService?: ReferralService,
) {
  const HEALTHCHECK_INTERVAL_MS = 5 * 60 * 1000;
  const HEALTHCHECK_FAIL_THRESHOLD = 2;
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let lastHealthcheckAt = 0;
  let lastReferralReconcileAt = 0;
  const REFERRAL_RECONCILE_INTERVAL_MS = 60 * 60 * 1000;
  const healthState = new Map<
    string,
    {
      consecutiveFailures: number;
      unhealthy: boolean;
      lastError: string | null;
    }
  >();

  const sendOpsAlertToAvailableAdapters = async (message: string, exceptPlatform?: string) => {
    await Promise.all(
      platformRegistry
        .list()
        .filter((adapter) => adapter.sendOpsAlert && adapter.platform !== exceptPlatform)
        .map(async (adapter) => {
          try {
            await adapter.sendOpsAlert?.(message);
          } catch (error) {
            logger.warn("Failed to send ops alert", {
              platform: adapter.platform,
              error,
            });
          }
        }),
    );
  };

  const runPlatformHealthchecks = async () => {
    for (const adapter of platformRegistry.list()) {
      if (!adapter.checkHealth) {
        continue;
      }

      const state = healthState.get(adapter.platform) ?? {
        consecutiveFailures: 0,
        unhealthy: false,
        lastError: null,
      };

      try {
        await adapter.checkHealth();
        if (state.unhealthy) {
          await sendOpsAlertToAvailableAdapters(
            `[${adapter.platform}] bot da phuc hoi va phan hoi binh thuong tro lai.`,
          );
        }
        healthState.set(adapter.platform, {
          consecutiveFailures: 0,
          unhealthy: false,
          lastError: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const nextFailures = state.consecutiveFailures + 1;
        const isNowUnhealthy = nextFailures >= HEALTHCHECK_FAIL_THRESHOLD;
        const shouldAlert =
          (isNowUnhealthy && !state.unhealthy) ||
          (isNowUnhealthy && state.unhealthy && state.lastError !== errorMessage);

        healthState.set(adapter.platform, {
          consecutiveFailures: nextFailures,
          unhealthy: isNowUnhealthy,
          lastError: errorMessage,
        });

        logger.warn("Platform healthcheck failed", {
          platform: adapter.platform,
          consecutiveFailures: nextFailures,
          error: errorMessage,
        });

        if (shouldAlert) {
          await sendOpsAlertToAvailableAdapters(
            `[${adapter.platform}] bot dang gap loi: ${errorMessage}`,
            adapter.platform,
          );
        }
      }
    }
  };

  const run = async () => {
    if (Date.now() - lastHealthcheckAt >= HEALTHCHECK_INTERVAL_MS) {
      await runPlatformHealthchecks();
      lastHealthcheckAt = Date.now();
    }
    if (referralService && Date.now() - lastReferralReconcileAt >= REFERRAL_RECONCILE_INTERVAL_MS) {
      try {
        await referralService.reconcileIntegrity();
      } catch (error) {
        logger.warn("Referral reconcile failed", { error });
      }
      lastReferralReconcileAt = Date.now();
    }

    const expiredOrders = await orderService.markExpiredOrders();
    for (const order of expiredOrders) {
      if (!order.paymentPromptChatId || !order.paymentPromptMessageId) {
        continue;
      }

      const target = membershipService.getMembershipTarget(order);
      const adapter = platformRegistry.get(target.platform);
      if (!adapter.clearPaymentPromptMessage) {
        continue;
      }

      try {
        await adapter.clearPaymentPromptMessage({
          chatId: order.paymentPromptChatId,
          messageId: order.paymentPromptMessageId,
        });
      } catch (error) {
        logger.warn("Failed to clear expired order payment prompt", {
          orderId: order.id,
          platform: target.platform,
          chatId: order.paymentPromptChatId,
          messageId: order.paymentPromptMessageId,
          error,
        });
      } finally {
        await orderService.clearPaymentPromptMessage(order.id);
      }
    }

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
        if (String(membership.source) === "TRIAL" && adapter.sendTrialExpiredNotice) {
          try {
            await adapter.sendTrialExpiredNotice(target);
          } catch (error) {
            logger.warn("Failed to send trial expiry notice", {
              membershipId: membership.id,
              platform: target.platform,
              userId: target.platformUserId,
              error,
            });
          }
        }
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
