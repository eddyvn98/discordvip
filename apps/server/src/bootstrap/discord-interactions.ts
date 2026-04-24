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
}, platform: "telegram" | "discord") => Promise<{ qrImageUrl: string | null; paymentInstruction: string }>;
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
        const customId = interaction.customId;
        const opensModal =
          customId.startsWith("admin_refpts:") ||
          customId === "ref_redeem_custom" ||
          customId === "acc_redeem_help";
        const requiresMessageUpdate = customId.startsWith("manual_");

        if (!opensModal && !requiresMessageUpdate && !interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        const handled = await handleDiscordButton({
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

        if (!handled) {
          logger.warn("Unhandled Discord button interaction", {
            customId: interaction.customId,
            userId: interaction.user.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
          });

          const content = "Nút này đã hết hiệu lực. Vui lòng mở lại menu và thử lại.";
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
          } else {
            await interaction.reply({
              flags: MessageFlags.Ephemeral,
              content,
            });
          }
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const handled = await handleDiscordModal({
          interaction,
          promoCodeService: input.promoCodeService,
          referralService: input.referralService,
          adminService: input.adminService,
          discordAdapter: input.discordAdapter,
        });
        if (!handled) {
          logger.warn("Unhandled Discord modal interaction", {
            customId: interaction.customId,
            userId: interaction.user.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
          });
          await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: "Mẫu nhập này đã hết hiệu lực. Vui lòng thao tác lại từ menu.",
          });
        }
        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const opened = await handleDiscordMenuCommand(interaction);
      if (opened) {
        return;
      }

      const handled = await handleDiscordChatCommand({
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
      if (!handled) {
        logger.warn("Unhandled Discord chat command", {
          commandName: interaction.commandName,
          userId: interaction.user.id,
          channelId: interaction.channelId,
          guildId: interaction.guildId,
        });
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: "Lệnh này chưa được hỗ trợ ở phiên bản hiện tại.",
        });
      }
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
