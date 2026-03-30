import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AdminService } from "../services/admin-service.js";

const telegramVipChannelSchema = z.object({
  id: z.string().trim().optional(),
  chatId: z.string().trim().min(1, "Chat ID là bắt buộc"),
  title: z.string().trim().min(1, "Tên kênh là bắt buộc"),
  isActive: z.coerce.boolean().default(true),
  planCodes: z.array(z.string().trim().min(1)).default([]),
});
const createTelegramVerificationSchema = z.object({
  requestedBy: z.string().trim().min(1).optional(),
});

export function registerAdminTelegramRoutes(
  app: Express,
  adminService: AdminService,
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void,
) {
  app.get("/api/admin/telegram-vip-config", requireAdmin, async (_req, res) => {
    res.json(await adminService.getTelegramVipConfig());
  });

  app.post("/api/admin/telegram-vip-channels", requireAdmin, async (req, res) => {
    try {
      const body = telegramVipChannelSchema.parse(req.body);
      res.json(await adminService.upsertTelegramVipChannel(body));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể lưu cấu hình kênh Telegram" });
    }
  });

  app.post("/api/admin/telegram-vip-channels/:id/delete", requireAdmin, async (req, res) => {
    try {
      res.json(await adminService.deleteTelegramVipChannel(String(req.params.id ?? "")));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể xóa kênh Telegram" });
    }
  });

  app.post("/api/admin/telegram-vip-verifications/create", requireAdmin, async (req, res) => {
    try {
      const body = createTelegramVerificationSchema.parse(req.body ?? {});
      const requestedBy = body.requestedBy || req.session.adminUser?.id || "admin_web";
      res.json(await adminService.createTelegramChannelVerification(requestedBy));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể tạo mã xác thực kênh Telegram" });
    }
  });

  app.post("/api/admin/telegram-vip-verifications/cleanup-expired", requireAdmin, async (_req, res) => {
    try {
      res.json(await adminService.cleanupExpiredTelegramChannelVerifications());
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể dọn mã xác thực hết hạn" });
    }
  });
}
