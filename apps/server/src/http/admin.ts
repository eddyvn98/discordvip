import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AdminService } from "../services/admin-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";

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

const promoCodeSchema = z.object({
  code: z.string().trim().min(1, "Mã khuyến mãi là bắt buộc"),
  label: z.string().trim().min(1, "Nhãn là bắt buộc"),
  durationDays: z.coerce.number().int("durationDays phải là số nguyên").positive(),
  maxUses: z.coerce.number().int("maxUses phải là số nguyên").positive(),
  expiresAt: z
    .union([z.string().datetime({ offset: true }), z.string().datetime(), z.null()])
    .optional(),
  isActive: z.coerce.boolean(),
});

const updatePromoCodeSchema = promoCodeSchema.omit({ code: true });

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminUser) {
    res.status(401).json({ error: "Chưa đăng nhập." });
    return;
  }

  next();
}

export function registerAdminRoutes(
  app: Express,
  adminService: AdminService,
  paymentService: PaymentService,
  promoCodeService: PromoCodeService,
) {
  app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({ user: req.session.adminUser });
  });

  app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
    res.json(await paymentService.getDashboardSummary());
  });

  app.get("/api/admin/vip-stats", requireAdmin, async (_req, res) => {
    res.json(await adminService.getVipStats());
  });

  app.get("/api/admin/transactions", requireAdmin, async (_req, res) => {
    const platform = typeof _req.query.platform === "string" ? _req.query.platform : undefined;
    res.json(await adminService.listTransactions(platform));
  });

  app.get("/api/admin/transactions/search", requireAdmin, async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
    if (!query) {
      res.json(await adminService.listTransactions(platform));
      return;
    }

    res.json(await adminService.searchTransactions(query, platform));
  });

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

  app.get("/api/admin/pending", requireAdmin, async (_req, res) => {
    res.json(await adminService.listPendingPayments());
  });

  app.get("/api/admin/promo-codes", requireAdmin, async (_req, res) => {
    res.json(await promoCodeService.listPromoCodes());
  });

  app.post("/api/admin/promo-codes", requireAdmin, async (req, res) => {
    try {
      const body = promoCodeSchema.parse(req.body);
      const result = await promoCodeService.createPromoCode({
        code: body.code,
        label: body.label,
        durationDays: body.durationDays,
        maxUses: body.maxUses,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive,
        createdBy: req.session.adminUser?.id,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể tạo mã khuyến mãi",
      });
    }
  });

  app.post("/api/admin/promo-codes/:id/update", requireAdmin, async (req, res) => {
    try {
      const body = updatePromoCodeSchema.parse(req.body);
      const result = await promoCodeService.updatePromoCode(String(req.params.id ?? ""), {
        label: body.label,
        durationDays: body.durationDays,
        maxUses: body.maxUses,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể cập nhật mã khuyến mãi",
      });
    }
  });

  app.get("/api/admin/orders/pending", requireAdmin, async (req, res) => {
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
    res.json(await adminService.listPendingOrders(platform));
  });

  app.get("/api/admin/orders/search", requireAdmin, async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
    if (!query) {
      res.json([]);
      return;
    }

    res.json(await adminService.searchOrders(query, platform));
  });

  app.post("/api/admin/pending/:paymentId/resolve", requireAdmin, async (req, res) => {
    try {
      const body = req.body as { orderCode?: string };
      const result = await paymentService.resolvePendingPayment(
        String(req.params.paymentId ?? ""),
        String(body.orderCode ?? ""),
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể xử lý giao dịch chờ duyệt",
      });
    }
  });

  app.post("/api/admin/pending/:paymentId/delete", requireAdmin, async (req, res) => {
    try {
      await adminService.deletePendingPayment(String(req.params.paymentId ?? ""));
      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể xóa giao dịch chờ duyệt",
      });
    }
  });

  app.post("/api/admin/orders/:orderId/confirm", requireAdmin, async (req, res) => {
    try {
      const result = await paymentService.confirmManualOrder(String(req.params.orderId ?? ""));
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Không thể xác nhận đơn thủ công",
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
}
