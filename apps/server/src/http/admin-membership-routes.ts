import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AdminService } from "../services/admin-service.js";

const manualGrantSchema = z.object({
  discordUserId: z.string().trim().min(1, "Discord user ID là bắt buộc"),
  durationDays: z.coerce
    .number()
    .int("durationDays phải là số nguyên")
    .refine((value) => value !== 0, "durationDays không được bằng 0"),
});

const lookupDiscordUserSchema = z.object({
  discordUserId: z.string().trim().min(1, "Discord user ID là bắt buộc"),
});

const adjustMembershipSchema = z.object({
  durationDays: z.coerce
    .number()
    .int("durationDays phai la so nguyen")
    .refine((value) => value !== 0, "durationDays khong duoc bang 0"),
});

export function registerAdminMembershipRoutes(
  app: Express,
  adminService: AdminService,
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void,
) {
  app.get("/api/admin/memberships", requireAdmin, async (req, res) => {
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
    const includeNames =
      typeof req.query.names === "string"
        ? req.query.names === "1" || req.query.names.toLowerCase() === "true"
        : true;
    res.json(await adminService.listMemberships(platform, includeNames));
  });

  app.get("/api/admin/memberships/meta", requireAdmin, async (req, res) => {
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
    res.json(await adminService.getMembershipsMeta(platform));
  });

  app.get("/api/admin/memberships/search", requireAdmin, async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
    const includeNames =
      typeof req.query.names === "string"
        ? req.query.names === "1" || req.query.names.toLowerCase() === "true"
        : true;
    if (!query) {
      res.json(await adminService.listMemberships(platform, includeNames));
      return;
    }
    res.json(await adminService.searchMemberships(query, platform, includeNames));
  });

  app.post("/api/admin/memberships/lookup-discord-user", requireAdmin, async (req, res) => {
    try {
      const body = lookupDiscordUserSchema.parse(req.body);
      res.json(await adminService.lookupDiscordGuildMember(body.discordUserId));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể kiểm tra Discord user",
      });
    }
  });

  app.post("/api/admin/memberships/manual-grant", requireAdmin, async (req, res) => {
    try {
      const body = manualGrantSchema.parse(req.body);
      const result = await adminService.adjustDiscordMembershipDuration({
        discordUserId: body.discordUserId,
        durationDays: body.durationDays,
        grantedBy: req.session.adminUser?.id,
        grantedFrom: "admin_web",
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể điều chỉnh VIP thủ công",
      });
    }
  });

  app.post("/api/admin/memberships/:membershipId/revoke", requireAdmin, async (req, res) => {
    try {
      const result = await adminService.revokeMembership(String(req.params.membershipId ?? ""));
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể thu hồi VIP",
      });
    }
  });

  app.post("/api/admin/memberships/:membershipId/adjust", requireAdmin, async (req, res) => {
    try {
      const body = adjustMembershipSchema.parse(req.body);
      const result = await adminService.adjustMembershipById({
        membershipId: String(req.params.membershipId ?? ""),
        durationDays: body.durationDays,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể điều chỉnh VIP",
      });
    }
  });
}
