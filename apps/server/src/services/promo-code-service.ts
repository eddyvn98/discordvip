import { MembershipStatus, Prisma } from "@prisma/client";

import { prisma } from "../prisma.js";
import { PlatformRegistry } from "./platform-registry.js";
import { PlatformKey, legacyUserIdFor, toPrismaPlatform } from "./platform.js";
import { MembershipService } from "./membership-service.js";

function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

function ensurePositiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} phải là số nguyên dương.`);
  }
}

export function validatePromoCodeInput(input: {
  code: string;
  label: string;
  durationDays: number;
  maxUses: number;
}) {
  const code = normalizePromoCode(input.code);
  const label = input.label.trim();

  if (!code) {
    throw new Error("Mã khuyến mãi là bắt buộc.");
  }

  if (!label) {
    throw new Error("Nhãn khuyến mãi là bắt buộc.");
  }

  ensurePositiveInteger(input.durationDays, "durationDays");
  ensurePositiveInteger(input.maxUses, "maxUses");

  return {
    code,
    label,
    durationDays: input.durationDays,
    maxUses: input.maxUses,
  };
}

export function validatePromoCodeUpdateInput(input: {
  label: string;
  durationDays: number;
  maxUses: number;
}) {
  const label = input.label.trim();

  if (!label) {
    throw new Error("Nhãn khuyến mãi là bắt buộc.");
  }

  ensurePositiveInteger(input.durationDays, "durationDays");
  ensurePositiveInteger(input.maxUses, "maxUses");

  return {
    label,
    durationDays: input.durationDays,
    maxUses: input.maxUses,
  };
}

export class PromoCodeService {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly platformRegistry: PlatformRegistry,
  ) {}

  async listPromoCodes() {
    return prisma.promoCode.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createPromoCode(input: {
    code: string;
    label: string;
    durationDays: number;
    maxUses: number;
    expiresAt?: Date | null;
    isActive: boolean;
    createdBy?: string | null;
  }) {
    const validated = validatePromoCodeInput(input);

    try {
      return await prisma.promoCode.create({
        data: {
          code: validated.code,
          label: validated.label,
          durationDays: validated.durationDays,
          maxUses: validated.maxUses,
          expiresAt: input.expiresAt ?? null,
          isActive: input.isActive,
          createdBy: input.createdBy ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Mã khuyến mãi đã tồn tại.");
      }
      throw error;
    }
  }

  async updatePromoCode(
    id: string,
    input: {
      label: string;
      durationDays: number;
      maxUses: number;
      expiresAt?: Date | null;
      isActive: boolean;
    },
  ) {
    const validated = validatePromoCodeUpdateInput(input);
    const existing = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Không tìm thấy mã khuyến mãi.");
    }

    if (input.maxUses < existing.usedCount) {
      throw new Error("maxUses không được nhỏ hơn usedCount.");
    }

    return prisma.promoCode.update({
      where: { id },
      data: {
        label: validated.label,
        durationDays: validated.durationDays,
        maxUses: validated.maxUses,
        expiresAt: input.expiresAt ?? null,
        isActive: input.isActive,
      },
    });
  }

  async redeemPromoCode(input: {
    code: string;
    platform: PlatformKey;
    platformUserId: string;
    platformChatId: string;
  }) {
    const normalizedCode = normalizePromoCode(input.code);
    const legacyUserId = legacyUserIdFor(input.platform, input.platformUserId);
    const now = new Date();

    const applied = await prisma.$transaction(async (tx) => {
      const promoCode = await tx.promoCode.findUnique({
        where: { code: normalizedCode },
      });

      if (!promoCode) {
        throw new Error("Mã khuyến mãi không tồn tại.");
      }

      if (!promoCode.isActive) {
        throw new Error("Mã khuyến mãi đã bị tắt.");
      }

      if (promoCode.expiresAt && promoCode.expiresAt.getTime() <= now.getTime()) {
        throw new Error("Mã khuyến mãi đã hết hạn.");
      }

      if (promoCode.usedCount >= promoCode.maxUses) {
        throw new Error("Mã khuyến mãi đã hết lượt sử dụng.");
      }

      const existingRedemption = await tx.promoCodeRedemption.findUnique({
        where: {
          promoCodeId_platform_platformUserId: {
            promoCodeId: promoCode.id,
            platform: toPrismaPlatform(input.platform),
            platformUserId: input.platformUserId,
          },
        },
      });

      if (existingRedemption) {
        throw new Error("Bạn đã sử dụng mã khuyến mãi này rồi.");
      }

      const membership = await this.membershipService.adjustManualMembershipInTransaction(tx, {
        platform: input.platform,
        platformUserId: input.platformUserId,
        platformChatId: input.platformChatId,
        durationDays: promoCode.durationDays,
      });

      await tx.promoCodeRedemption.create({
        data: {
          promoCodeId: promoCode.id,
          platform: toPrismaPlatform(input.platform),
          platformUserId: input.platformUserId,
          platformChatId: input.platformChatId,
          discordUserId: legacyUserId,
          durationDaysApplied: promoCode.durationDays,
        },
      });

      const updatedPromoCode = await tx.promoCode.update({
        where: { id: promoCode.id },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });

      return { membership, promoCode: updatedPromoCode };
    });

    const target = this.membershipService.getMembershipTarget(applied.membership);

    try {
      if (
        applied.membership.status === MembershipStatus.ACTIVE &&
        applied.membership.expireAt.getTime() > Date.now()
      ) {
        await this.platformRegistry.get(input.platform).grantAccess(target);
      }
    } catch (error) {
      await prisma.membership.update({
        where: { id: applied.membership.id },
        data: {
          lastError: error instanceof Error ? error.message : "Grant access failed",
        },
      });
      throw new Error(
        error instanceof Error
          ? `Đã cộng VIP nhưng không thể cấp role: ${error.message}`
          : "Đã cộng VIP nhưng không thể cấp role.",
      );
    }

    return applied;
  }
}
