import { env } from "../../config.js";
import { prisma } from "../../prisma.js";
import type { TelegramDonatePlan } from "./types.js";

export async function getActiveDonatePlans(): Promise<TelegramDonatePlan[]> {
  const mappedPlans = await prisma.plan.findMany({
    where: {
      isActive: true,
      telegramChannelMappings: {
        some: {
          channel: {
            isActive: true,
          },
        },
      },
    },
    orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
    select: { code: true, name: true, amount: true },
  });

  const plans =
    mappedPlans.length > 0
      ? mappedPlans
      : await prisma.plan.findMany({
          where: { isActive: true },
          orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
          select: { code: true, name: true, amount: true },
        });

  return plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    amount: plan.amount,
  }));
}

export async function getAllConfiguredVipChatIds(): Promise<string[]> {
  const channels = await prisma.telegramVipChannel.findMany({
    where: { isActive: true },
    select: { chatId: true },
  });
  return Array.from(new Set([env.TELEGRAM_VIP_CHAT_ID, ...channels.map((channel) => channel.chatId)].filter(Boolean)));
}

export async function getVipChatIdsForPlan(planCode?: string): Promise<string[]> {
  const normalizedPlanCode = planCode?.toUpperCase().trim();
  if (!normalizedPlanCode) {
    return getAllConfiguredVipChatIds();
  }

  const channels = await prisma.telegramPlanChannel.findMany({
    where: {
      plan: {
        code: normalizedPlanCode,
        isActive: true,
      },
      channel: {
        isActive: true,
      },
    },
    select: {
      channel: {
        select: { chatId: true },
      },
    },
  });

  const fromPlan = channels.map((item) => item.channel.chatId);
  if (fromPlan.length > 0) {
    return fromPlan;
  }

  return getAllConfiguredVipChatIds();
}
