import { PaymentStatus } from "@prisma/client";

import { prisma } from "../prisma.js";

export class AdminService {
  async listTransactions() {
    return prisma.payment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        order: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  async listMemberships() {
    return prisma.membership.findMany({
      orderBy: {
        expireAt: "asc",
      },
      take: 100,
    });
  }

  async listPendingPayments() {
    return prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING_REVIEW,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }

  async searchOrders(query: string) {
    return prisma.order.findMany({
      where: {
        OR: [
          {
            orderCode: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            discordUserId: {
              contains: query,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      include: {
        plan: true,
      },
    });
  }
}
