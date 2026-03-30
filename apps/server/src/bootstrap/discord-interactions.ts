import { Events, MessageFlags } from "discord.js";

import { logger } from "../lib/logger.js";
import { AdminService } from "../services/admin-service.js";
import { DiscordPlatformAdapter } from "../services/discord-platform-adapter.js";
import { DiscordService } from "../services/discord-service.js";
import { MembershipService } from "../services/membership-service.js";
import { OrderService } from "../services/order-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";
import { ReferralService } from "../services/referral-service.js";
import { handleDiscordButton, handleDiscordMenuCommand, handleDiscordModal } from "./discord-button-handlers.js";
import { handleDiscordChatCommand } from "./discord-command-handlers.js";

type BuildOrderMessageFn = (order: {
  amount: number;
  orderCode: string;
  expiresAt: Date;
  plan: { name: string; durationDays: number };
}) => Promise<{ qrImageUrl: string | null; paymentInstruction: string }>;
type BuildVipAccessTitleFn = (order: { amount: number; plan: { durationDays: number } }) => string;

export function registerDiscordInteractions(input: {
  discordService: DiscordService;
  discordAdapter: DiscordPlatformAdapter;
  orderService: OrderService;
  membershipService: MembershipService;
  promoCodeService: PromoCodeService;
  paymentService: PaymentService;
  adminService: AdminService;
  referralService: ReferralService;
  buildOrderMessage: BuildOrderMessageFn;
  buildVipAccessTitle: BuildVipAccessTitleFn;
}) {
  input.discordService.client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton()) {
        await handleDiscordButton({
          interaction,
          discordService: input.discordService,
          discordAdapter: input.discordAdapter,
          paymentService: input.paymentService,
          referralService: input.referralService,
          orderService: input.orderService,
          membershipService: input.membershipService,
          buildOrderMessage: input.buildOrderMessage,
          buildVipAccessTitle: input.buildVipAccessTitle,
        });
        return;
      }

      if (interaction.isModalSubmit()) {
        await handleDiscordModal({
          interaction,
          promoCodeService: input.promoCodeService,
          referralService: input.referralService,
        });
        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const opened = await handleDiscordMenuCommand(interaction);
      if (opened) {
        return;
      }

      await handleDiscordChatCommand({
        interaction,
        discordService: input.discordService,
        discordAdapter: input.discordAdapter,
        orderService: input.orderService,
        membershipService: input.membershipService,
        promoCodeService: input.promoCodeService,
        adminService: input.adminService,
        buildOrderMessage: input.buildOrderMessage,
        buildVipAccessTitle: input.buildVipAccessTitle,
      });
    } catch (error) {
      logger.error("Interaction handling failed", { error });
      if (interaction.isRepliable() && (interaction.deferred || interaction.replied)) {
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: "Đã có lỗi xảy ra, vui lòng thử lại.",
        });
      } else if (interaction.isRepliable()) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: "Đã có lỗi xảy ra, vui lòng thử lại.",
        });
      }
    }
  });
}
