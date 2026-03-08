import { nanoid } from "nanoid";

import { OrderStatus } from "@prisma/client";

import { prisma } from "../prisma.js";

export class OrderService {
  async createOrder(discordUserId: string, guildId: string, planCode: string) {
    const plan = await prisma.plan.findUnique({
      where: { code: planCode },
    });

    if (!plan || !plan.isActive) {
      throw new Error("Gói VIP không tồn tại hoặc đang bị khóa.");
    }

    const orderCode = nanoid(10).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return prisma.order.create({
      data: {
        orderCode,
        discordUserId,
        guildId,
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
