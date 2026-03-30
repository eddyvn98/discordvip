import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AdminService } from "../services/admin-service.js";

const adjustReferralPointsSchema = z.object({
  platform: z.enum(["discord", "telegram"]),
  userId: z.string().trim().min(1, "userId là bắt buộc"),
  deltaPoints: z.coerce.number().int().refine((value) => value !== 0, "deltaPoints không được bằng 0"),
  note: z.string().trim().optional(),
});

export function registerAdminReferralRoutes(
  app: Express,
  adminService: AdminService,
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void,
) {
  app.get("/api/admin/referrals/summary", requireAdmin, async (_req, res) => {
    res.json(await adminService.getReferralSummary());
  });

  app.get("/api/admin/referrals/events", requireAdmin, async (_req, res) => {
    res.json(await adminService.listReferralEvents());
  });

  app.get("/api/admin/referrals/redemptions", requireAdmin, async (_req, res) => {
    res.json(await adminService.listReferralRedemptions());
  });

  app.post("/api/admin/referrals/points/adjust", requireAdmin, async (req, res) => {
    try {
      const body = adjustReferralPointsSchema.parse(req.body);
      res.json(
        await adminService.adjustReferralPoints({
          platform: body.platform,
          userId: body.userId,
          deltaPoints: body.deltaPoints,
          note: body.note,
        }),
      );
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể điều chỉnh điểm referral",
      });
    }
  });
}
