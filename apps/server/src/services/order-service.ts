import { customAlphabet } from "nanoid";

import { OrderStatus } from "@prisma/client";

import { normalizeOrderCodeToken } from "../lib/billing.js";
import { prisma } from "../prisma.js";
import { PlatformKey, legacyUserIdFor, toPrismaPlatform } from "./platform.js";

const generateOrderCode = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 10);

export class OrderService {
  async createOrder(input: {
    platform: PlatformKey;
    platformUserId: string;
    platformChatId: string;
    planCode: string;
  }) {
    const plan = await prisma.plan.findUnique({
      where: { code: input.planCode },
    });

    if (!plan || !plan.isActive) {
      throw new Error("Gói VIP không tồn tại hoặc đang bị khóa.");
    }

    const orderCode = generateOrderCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return prisma.order.create({
      data: {
        orderCode,
        discordUserId: legacyUserIdFor(input.platform, input.platformUserId),
        guildId: input.platformChatId,
        platform: toPrismaPlatform(input.platform),
        platformUserId: input.platformUserId,
        platformChatId: input.platformChatId,
        planId: plan.id,
        amount: plan.amount,
        expiresAt,
      },
      include: {
        plan: true,
      },
    });
  }

  async findByCode(orderCode: string) {
    return prisma.order.findUnique({
      where: { orderCode },
      include: { plan: true },
    });
  }

  async findByTransferredCode(orderCode: string) {
    const exactCode = orderCode.toUpperCase();
    const exact = await this.findByCode(exactCode);
    if (exact) {
      return exact;
    }

    const normalizedInput = normalizeOrderCodeToken(orderCode);
    if (!normalizedInput) {
      return null;
    }

    const candidates = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT o.id
      FROM "Order" o
      WHERE o.status = 'PENDING'
        AND regexp_replace(upper(o."orderCode"), '[^A-Z0-9]', '', 'g') = ${normalizedInput}
      ORDER BY o."createdAt" DESC
      LIMIT 2
    `;

    if (candidates.length !== 1) {
      return null;
    }

    return prisma.order.findUnique({
      where: { id: candidates[0].id },
      include: { plan: true },
    });
  }

  async markExpiredOrders() {
    return prisma.order.updateMany({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: OrderStatus.EXPIRED,
      },
    });
  }
}
