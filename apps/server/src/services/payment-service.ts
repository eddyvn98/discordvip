import { PaymentStatus, WebhookProcessStatus } from "@prisma/client";

import { env } from "../config.js";
import { extractOrderCode } from "../lib/billing.js";
import { logger } from "../lib/logger.js";
import { normalizeSepayPayload, type NormalizedSepayPayload } from "../lib/sepay.js";
import { prisma } from "../prisma.js";
import { PlatformRegistry } from "./platform-registry.js";
import { fromPrismaPlatform } from "./platform.js";
import { MembershipService } from "./membership-service.js";
import { OrderService } from "./order-service.js";

export class PaymentService {
  constructor(
    private readonly orderService: OrderService,
    private readonly membershipService: MembershipService,
    private readonly platformRegistry: PlatformRegistry,
  ) {}

  private getOrderTarget(order: {
    platform: unknown;
    platformUserId: string | null;
    platformChatId: string | null;
    discordUserId: string;
    guildId: string;
  }) {
    const platform = fromPrismaPlatform(String(order.platform ?? "DISCORD"));
    return {
      platform,
      platformUserId:
        order.platformUserId ??
        (platform === "telegram" ? order.discordUserId.replace(/^tg_/u, "") : order.discordUserId),
      platformChatId: order.platformChatId ?? order.guildId,
    };
  }

  private async getAlignedPaidRevenueForGuild() {
    const activePaidUsers = await prisma.membership.findMany({
      where: {
        platform: "DISCORD",
        guildId: env.DISCORD_GUILD_ID,
        status: "ACTIVE",
        source: "PAID",
        expireAt: {
          gt: new Date(),
        },
      },
      distinct: ["discordUserId"],
      select: {
        discordUserId: true,
      },
    });

    const latestValidPayments = await Promise.all(
      activePaidUsers.map(async ({ discordUserId }) => {
        const payments = await prisma.payment.findMany({
          where: {
            status: PaymentStatus.MATCHED,
            order: {
              is: {
                platform: "DISCORD",
                guildId: env.DISCORD_GUILD_ID,
                discordUserId,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            amount: true,
            providerTransactionId: true,
            transferContent: true,
            order: {
              select: {
                amount: true,
                orderCode: true,
              },
            },
          },
        });

        return (
          payments.find((payment) => {
            if (!payment.order) {
              return false;
            }

            const txId = payment.providerTransactionId.toLowerCase();
            const content = payment.transferContent?.toLowerCase() ?? "";
            const orderCode = payment.order.orderCode.toLowerCase();

            return (
              !txId.startsWith("manual_") &&
              !txId.startsWith("tx-form-") &&
              payment.amount === payment.order.amount &&
              content.includes(orderCode)
            );
          }) ?? null
        );
      }),
    );

    return latestValidPayments.reduce((sum, payment) => sum + (payment?.amount ?? 0), 0);
  }

  async processWebhook(payload: unknown, signature: string | null) {
    const normalized = normalizeSepayPayload(payload);

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        providerEventId: normalized.providerEventId,
        signature,
        payload: normalized.raw as never,
      },
    });

    try {
      const result = await this.processNormalizedPayment(normalized);
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processStatus: result.duplicate
            ? WebhookProcessStatus.DUPLICATE
            : WebhookProcessStatus.PROCESSED,
        },
      });
      return result;
    } catch (error) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processStatus: WebhookProcessStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }

  private async processNormalizedPayment(normalized: NormalizedSepayPayload) {
    const existingPayment = await prisma.payment.findUnique({
      where: {
        providerTransactionId: normalized.transactionId,
      },
    });

    if (existingPayment?.status === PaymentStatus.MATCHED) {
      return { duplicate: true, status: "duplicate" as const };
    }

    const orderCode = extractOrderCode(normalized.transferContent);
    const order = orderCode ? await this.orderService.findByTransferredCode(orderCode) : null;

    if (
      !order ||
      order.status !== "PENDING" ||
      order.amount !== normalized.amount ||
      order.expiresAt.getTime() < Date.now()
    ) {
      await this.membershipService.createPendingPayment({
        providerTransactionId: normalized.transactionId,
        amount: normalized.amount,
        transferContent: normalized.transferContent,
        bankRef: normalized.bankRef,
        payerName: normalized.payerName,
        raw: normalized.raw as never,
      });

      logger.warn("Payment moved to pending review", {
        transactionId: normalized.transactionId,
        orderCode,
      });

      return { duplicate: false, status: "pending_review" as const };
    }

    const target = this.getOrderTarget(order);
    const applied = await this.membershipService.applyPaidOrder({
      orderId: order.id,
      platform: target.platform,
      platformUserId: target.platformUserId,
      platformChatId: target.platformChatId,
      amount: normalized.amount,
      durationDays: order.plan.durationDays,
      providerTransactionId: normalized.transactionId,
      transferContent: normalized.transferContent,
      bankRef: normalized.bankRef,
      payerName: normalized.payerName,
      raw: normalized.raw as never,
    });

    if (!applied.duplicate) {
      const adapter = this.platformRegistry.get(target.platform);

      try {
        await adapter.grantAccess(target);
      } catch (error) {
        await prisma.membership.update({
          where: { id: applied.membership!.id },
          data: {
            lastError: error instanceof Error ? error.message : "Grant access failed",
          },
        });
        logger.error("Failed to grant VIP access after payment", {
          platform: target.platform,
          platformUserId: target.platformUserId,
          error,
        });
      }

      if (applied.membership) {
        try {
          await adapter.sendVipActivatedNotice(target, applied.membership.expireAt);
        } catch (error) {
          logger.warn("Failed to send VIP activated notice", {
            platform: target.platform,
            platformUserId: target.platformUserId,
            error,
          });
        }

        try {
          await adapter.sendAdminAutoPaymentConfirmedNotice({
            target,
            orderCode: order.orderCode,
            amount: normalized.amount,
            expireAt: applied.membership.expireAt,
            providerTransactionId: normalized.transactionId,
          });
        } catch (error) {
          logger.warn("Failed to send admin auto payment confirmation", {
            platform: target.platform,
            orderCode: order.orderCode,
            transactionId: normalized.transactionId,
            error,
          });
        }
      }
    }

    return { duplicate: false, status: "matched" as const };
  }

  async resolvePendingPayment(paymentId: string, orderCode: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== PaymentStatus.PENDING_REVIEW) {
      throw new Error("Payment pending không tồn tại.");
    }

    const order = await this.orderService.findByCode(orderCode.toUpperCase());
    if (!order) {
      throw new Error("Order code không hợp lệ.");
    }

    if (order.amount !== payment.amount) {
      throw new Error("Số tiền payment không khớp với order.");
    }

    if (order.status !== "PENDING") {
      throw new Error("Order này không còn ở trạng thái pending.");
    }

    const target = this.getOrderTarget(order);
    const applied = await this.membershipService.applyPaidOrder({
      orderId: order.id,
      platform: target.platform,
      platformUserId: target.platformUserId,
      platformChatId: target.platformChatId,
      amount: payment.amount,
      durationDays: order.plan.durationDays,
      providerTransactionId: payment.providerTransactionId,
      transferContent: payment.transferContent ?? "",
      bankRef: payment.bankRef,
      payerName: payment.payerName,
      raw: payment.raw as never,
    });

    await this.platformRegistry.get(target.platform).grantAccess(target);
    return applied;
  }

  async confirmManualOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { plan: true },
    });

    if (!order) {
      throw new Error("Order không tồn tại.");
    }

    if (order.status !== "PENDING") {
      throw new Error("Order này không còn ở trạng thái pending.");
    }

    if (order.expiresAt.getTime() < Date.now()) {
      throw new Error("Order đã hết hạn.");
    }

    const target = this.getOrderTarget(order);
    const applied = await this.membershipService.applyPaidOrder({
      orderId: order.id,
      platform: target.platform,
      platformUserId: target.platformUserId,
      platformChatId: target.platformChatId,
      amount: order.amount,
      durationDays: order.plan.durationDays,
      providerTransactionId: `manual_${order.orderCode}`,
      transferContent: `MANUAL ${order.orderCode}`,
      bankRef: null,
      payerName: "manual_admin",
      raw: {
        source: "manual_admin_confirmation",
        orderCode: order.orderCode,
      },
    });

    await this.platformRegistry.get(target.platform).grantAccess(target);
    return applied;
  }

  async rejectManualOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error("Order không tồn tại.");
    }

    if (order.status !== "PENDING") {
      throw new Error("Order này không còn ở trạng thái pending.");
    }

    return prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
      },
    });
  }

  async getDashboardSummary() {
    const guildScopedOrderWhere = {
      platform: "DISCORD" as const,
      guildId: env.DISCORD_GUILD_ID,
    };

    const guildScopedMembershipWhere = {
      platform: "DISCORD" as const,
      guildId: env.DISCORD_GUILD_ID,
    };

    const [matchedRevenue, pendingPayments, pendingOrders, activeMemberships, recentPayments] =
      await Promise.all([
        this.getAlignedPaidRevenueForGuild(),
        prisma.payment.count({
          where: { status: PaymentStatus.PENDING_REVIEW },
        }),
        prisma.order.count({
          where: {
            status: "PENDING",
            expiresAt: {
              gt: new Date(),
            },
          },
        }),
        prisma.membership.count({
          where: {
            ...guildScopedMembershipWhere,
            status: "ACTIVE",
            expireAt: {
              gt: new Date(),
            },
          },
        }),
        prisma.payment.findMany({
          where: {
            order: {
              is: guildScopedOrderWhere,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            order: {
              include: { plan: true },
            },
          },
        }),
      ]);

    return {
      revenue: matchedRevenue,
      pendingCount: env.PAYMENT_MODE === "manual" ? pendingOrders : pendingPayments,
      activeMemberships,
      recentPayments,
      guildId: env.DISCORD_GUILD_ID,
    };
  }
}
