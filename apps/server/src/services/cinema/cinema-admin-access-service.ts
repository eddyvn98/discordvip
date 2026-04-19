import { Platform, type CinemaAdminPermission, type AdminPrincipal } from "@prisma/client";
import type { Request } from "express";

import { env } from "../../config.js";
import { prisma } from "../../prisma.js";

export type CinemaPermissionAction = "view" | "upload" | "forward" | "manage" | "delete";

export type CinemaActor = {
  platform: "discord" | "telegram";
  platformUserId: string;
  displayName?: string | null;
};

type PrincipalWithPermissions = AdminPrincipal & {
  permissions: CinemaAdminPermission[];
};

export type CinemaAccessProfile = {
  actor: CinemaActor;
  isSuperAdmin: boolean;
  mode: "super_admin" | "mapped" | "legacy_admin";
  principal: PrincipalWithPermissions | null;
};

function toPlatform(platform: "discord" | "telegram") {
  return platform === "telegram" ? Platform.TELEGRAM : Platform.DISCORD;
}

export class CinemaAdminAccessService {
  private hasInternalSecret(req: Request) {
    const internalSecret = req.headers["x-internal-secret"];
    const secret = process.env.ADMIN_DEBUG_LOGIN_SECRET || "internal-secret";
    return Boolean(internalSecret && internalSecret === secret);
  }

  resolveActorFromRequest(req: Request): CinemaActor | null {
    const sessionAdmin = req.session.adminUser;
    if (sessionAdmin?.id) {
      return {
        platform: "discord",
        platformUserId: String(sessionAdmin.id),
        displayName: sessionAdmin.username,
      };
    }

    if (!this.hasInternalSecret(req)) {
      return null;
    }

    const telegramActor = String(req.headers["x-telegram-user-id"] ?? "").trim();
    if (telegramActor) {
      return {
        platform: "telegram",
        platformUserId: telegramActor,
        displayName: "telegram-bot-admin",
      };
    }

    const discordActor = String(req.headers["x-discord-user-id"] ?? "").trim();
    if (discordActor) {
      return {
        platform: "discord",
        platformUserId: discordActor,
        displayName: "internal-discord-admin",
      };
    }

    if (process.env.DEV_BYPASS_ADMIN_AUTH === "true") {
      return {
        platform: "discord",
        platformUserId: "dev-bypass-admin",
        displayName: "dev-bypass-admin",
      };
    }

    return null;
  }

  private isSuperAdmin(actor: CinemaActor) {
    if (actor.platform === "telegram") {
      return env.adminTelegramIds.includes(actor.platformUserId);
    }
    return env.adminDiscordIds.includes(actor.platformUserId);
  }

  async getAccessProfile(actor: CinemaActor): Promise<CinemaAccessProfile> {
    const isSuperAdmin = this.isSuperAdmin(actor);
    const principal = await prisma.adminPrincipal.findUnique({
      where: {
        platform_platformUserId: {
          platform: toPlatform(actor.platform),
          platformUserId: actor.platformUserId,
        },
      },
      include: {
        permissions: true,
      },
    });

    if (isSuperAdmin) {
      return {
        actor,
        isSuperAdmin: true,
        mode: "super_admin",
        principal,
      };
    }

    if (principal && principal.isActive) {
      return {
        actor,
        isSuperAdmin: false,
        mode: "mapped",
        principal,
      };
    }

    // Backward compatibility: existing Discord admins from OAuth role-based login keep access.
    // Once explicit mapping is created, access is constrained by mapping.
    if (actor.platform === "discord") {
      return {
        actor,
        isSuperAdmin: false,
        mode: "legacy_admin",
        principal: null,
      };
    }

    return {
      actor,
      isSuperAdmin: false,
      mode: "mapped",
      principal: null,
    };
  }

  private permissionFlag(permission: CinemaAdminPermission, action: CinemaPermissionAction) {
    if (action === "view") return permission.canView;
    if (action === "upload") return permission.canUpload;
    if (action === "forward") return permission.canForward;
    if (action === "manage") return permission.canManage;
    return permission.canDelete;
  }

  canAccessGlobal(profile: CinemaAccessProfile, action: CinemaPermissionAction) {
    if (profile.isSuperAdmin || profile.mode === "legacy_admin") {
      return true;
    }
    const permissions = profile.principal?.permissions ?? [];
    return permissions.some((permission) => permission.channelId === null && this.permissionFlag(permission, action));
  }

  canAccessChannel(profile: CinemaAccessProfile, channelId: string, action: CinemaPermissionAction) {
    if (profile.isSuperAdmin || profile.mode === "legacy_admin") {
      return true;
    }
    const permissions = profile.principal?.permissions ?? [];
    return permissions.some((permission) => {
      if (!this.permissionFlag(permission, action)) return false;
      return permission.channelId === null || permission.channelId === channelId;
    });
  }

  filterChannelsByAction<T extends { id: string }>(profile: CinemaAccessProfile, channels: T[], action: CinemaPermissionAction) {
    if (profile.isSuperAdmin || profile.mode === "legacy_admin") {
      return channels;
    }
    return channels.filter((channel) => this.canAccessChannel(profile, channel.id, action));
  }

  async upsertAdminPrincipal(input: {
    platform: "discord" | "telegram";
    platformUserId: string;
    displayName?: string;
    isActive?: boolean;
  }) {
    const platform = toPlatform(input.platform);
    const platformUserId = input.platformUserId.trim();
    if (!platformUserId) {
      throw new Error("platformUserId is required");
    }
    return prisma.adminPrincipal.upsert({
      where: {
        platform_platformUserId: {
          platform,
          platformUserId,
        },
      },
      update: {
        displayName: input.displayName?.trim() || null,
        isActive: input.isActive ?? true,
      },
      create: {
        platform,
        platformUserId,
        displayName: input.displayName?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
  }

  async upsertPermission(input: {
    adminId: string;
    channelId?: string | null;
    canView?: boolean;
    canUpload?: boolean;
    canForward?: boolean;
    canManage?: boolean;
    canDelete?: boolean;
  }) {
    const adminId = input.adminId.trim();
    if (!adminId) {
      throw new Error("adminId is required");
    }
    const channelId = input.channelId ? input.channelId.trim() : null;
    const current = await prisma.cinemaAdminPermission.findFirst({
      where: { adminId, channelId },
    });
    if (current) {
      return prisma.cinemaAdminPermission.update({
        where: { id: current.id },
        data: {
          canView: input.canView ?? current.canView,
          canUpload: input.canUpload ?? current.canUpload,
          canForward: input.canForward ?? current.canForward,
          canManage: input.canManage ?? current.canManage,
          canDelete: input.canDelete ?? current.canDelete,
        },
      });
    }

    return prisma.cinemaAdminPermission.create({
      data: {
        adminId,
        channelId,
        canView: input.canView ?? true,
        canUpload: input.canUpload ?? false,
        canForward: input.canForward ?? false,
        canManage: input.canManage ?? false,
        canDelete: input.canDelete ?? false,
      },
    });
  }

  async listAdminsWithPermissions() {
    return prisma.adminPrincipal.findMany({
      orderBy: [{ createdAt: "asc" }],
      include: {
        permissions: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });
  }

  async listPendingAdminRequests() {
    return prisma.adminPrincipal.findMany({
      where: {
        isActive: false,
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async approveAdminRequest(input: { id: string; defaultGlobalView?: boolean }) {
    const id = input.id.trim();
    if (!id) {
      throw new Error("id is required");
    }
    const principal = await prisma.adminPrincipal.findUnique({ where: { id } });
    if (!principal) {
      throw new Error("Admin request not found");
    }
    const updated = await prisma.adminPrincipal.update({
      where: { id },
      data: { isActive: true },
    });

    const shouldGrantDefaultView = input.defaultGlobalView !== false;
    if (shouldGrantDefaultView) {
      await this.upsertPermission({
        adminId: updated.id,
        channelId: null,
        canView: true,
        canUpload: false,
        canForward: false,
        canManage: false,
        canDelete: false,
      });
    }
    return updated;
  }

  async rejectAdminRequest(input: { id: string }) {
    const id = input.id.trim();
    if (!id) {
      throw new Error("id is required");
    }
    const principal = await prisma.adminPrincipal.findUnique({ where: { id } });
    if (!principal) {
      throw new Error("Admin request not found");
    }
    await prisma.cinemaAdminPermission.deleteMany({ where: { adminId: id } });
    await prisma.adminPrincipal.delete({ where: { id } });
    return { ok: true };
  }
}
