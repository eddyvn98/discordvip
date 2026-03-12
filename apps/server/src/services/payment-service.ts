import { PaymentStatus, WebhookProcessStatus } from "@prisma/client";

import { env } from "../config.js";
import { extractOrderCode } from "../lib/billing.js";
import { logger } from "../lib/logger.js";
import { normalizeSepayPayload, type NormalizedSepayPayload } from "../lib/sepay.js";
import { prisma } from "../prisma.js";
import { DiscordService } from "./discord-service.js";
import { MembershipService } from "./membership-service.js";
import { OrderService } from "./order-service.js";

export class PaymentService {
  constructor(
    private readonly orderService: OrderService,
    private readonly membershipService: MembershipService,
    private readonly discordService: DiscordService,
  ) {}

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

    const applied = await this.membershipService.applyPaidOrder({
      orderId: order.id,
      discordUserId: order.discordUserId,
      amount: normalized.amount,
      durationDays: order.plan.durationDays,
      providerTransactionId: normalized.transactionId,
      transferContent: normalized.transferContent,
      bankRef: normalized.bankRef,
      payerName: normalized.payerName,
      raw: normalized.raw as never,
    });

    if (!applied.duplicate) {
      try {
        await this.discordService.addVipRole(order.discordUserId);
      } catch (error) {
        await prisma.membership.update({
          where: { id: applied.membership!.id },
          data: {
            lastError: error instanceof Error ? error.message : "Grant role failed",
          },
        });
        logger.error("Failed to grant VIP role after payment", {
          discordUserId: order.discordUserId,
          error,
        });
      }

      if (applied.membership) {
        try {
          await this.discordService.sendVipActivatedNotice(
            order.discordUserId,
            applied.membership.expireAt,
          );
        } catch (error) {
          logger.warn("Failed to send VIP activated DM", {
            discordUserId: order.discordUserId,
            error,
          });
        }

        try {
          await this.discordService.sendAdminAutoPaymentConfirmedNotice({
            discordUserId: order.discordUserId,
            orderCode: order.orderCode,
            amount: normalized.amount,
            expireAt: applied.membership.expireAt,
            providerTransactionId: normalized.transactionId,
          });
        } catch (error) {
          logger.warn("Failed to send admin auto payment confirmation", {
            discordUserId: order.discordUserId,
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

    const applied = await this.membershipService.applyPaidOrder({
      orderId: order.id,
      discordUserId: order.discordUserId,
      amount: payment.amount,
      durationDays: order.plan.durationDays,
      providerTransactionId: payment.providerTransactionId,
      transferContent: payment.transferContent ?? "",
      bankRef: payment.bankRef,
      payerName: payment.payerName,
      raw: payment.raw as never,
    });

    await this.discordService.addVipRole(order.discordUserId);
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

    const applied = await this.membershipService.applyPaidOrder({
      orderId: order.id,
      discordUserId: order.discordUserId,
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

    await this.discordService.addVipRole(order.discordUserId);
    return applied;
  }

  async rejectManualOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error("Order khÃ´ng tá»“n táº¡i.");
    }

    if (order.status !== "PENDING") {
      throw new Error("Order nÃ y khÃ´ng cÃ²n á»Ÿ tráº¡ng thÃ¡i pending.");
    }

    return prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
      },
    });
  }

  async getDashboardSummary() {
    const [matchedRevenue, pendingPayments, pendingOrders, activeMemberships, recentPayments] =
      await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: PaymentStatus.MATCHED },
        }),
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
            status: "ACTIVE",
            expireAt: {
              gt: new Date(),
            },
          },
        }),
        prisma.payment.findMany({
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
      revenue: matchedRevenue._sum.amount ?? 0,
      pendingCount: env.PAYMENT_MODE === "manual" ? pendingOrders : pendingPayments,
      activeMemberships,
      recentPayments,
      guildId: env.DISCORD_GUILD_ID,
    };
  }
}
