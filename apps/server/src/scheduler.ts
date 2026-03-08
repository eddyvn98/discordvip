import { logger } from "./lib/logger.js";
import { DiscordService } from "./services/discord-service.js";
import { MembershipService } from "./services/membership-service.js";
import { OrderService } from "./services/order-service.js";

export function startSchedulers(
  membershipService: MembershipService,
  discordService: DiscordService,
  orderService: OrderService,
) {
  const run = async () => {
    await orderService.markExpiredOrders();
    const dueMemberships = await membershipService.expireDueMemberships(20);

    for (const membership of dueMemberships) {
      try {
        await discordService.removeVipRole(membership.discordUserId);
        await membershipService.markMembershipExpired(membership.id);
        logger.info("Expired VIP membership removed", {
          membershipId: membership.id,
          userId: membership.discordUserId,
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
