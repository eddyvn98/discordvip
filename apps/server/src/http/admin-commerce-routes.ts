import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AdminService } from "../services/admin-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";

const promoCodeSchema = z.object({
  code: z.string().trim().min(1, "Mã khuyến mãi là bắt buộc"),
  label: z.string().trim().min(1, "Nhãn là bắt buộc"),
  durationDays: z.coerce.number().int("durationDays phải là số nguyên").positive(),
  maxUses: z.coerce.number().int("maxUses phải là số nguyên").positive(),
  expiresAt: z.union([z.string().datetime({ offset: true }), z.string().datetime(), z.null()]).optional(),
  isActive: z.coerce.boolean(),
});
const updatePromoCodeSchema = promoCodeSchema.omit({ code: true });

const createPlanSchema = z.object({
  code: z.string().trim().min(1, "Mã plan là bắt buộc"),
  name: z.string().trim().min(1, "Tên plan là bắt buộc"),
  amount: z.coerce.number().int().positive("Giá tiền phải > 0"),
  durationDays: z.coerce.number().int().positive("Số ngày phải > 0"),
  isActive: z.coerce.boolean().default(true),
});
const updatePlanSchema = createPlanSchema.omit({ code: true });

export function registerAdminCommerceRoutes(
  app: Express,
  adminService: AdminService,
  paymentService: PaymentService,
  promoCodeService: PromoCodeService,
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void,
) {
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
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể tạo mã khuyến mãi" });
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
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể cập nhật mã khuyến mãi" });
    }
  });

  app.get("/api/admin/plans", requireAdmin, async (_req, res) => {
    res.json(await adminService.listPlans());
  });

  app.post("/api/admin/plans", requireAdmin, async (req, res) => {
    try {
      const body = createPlanSchema.parse(req.body);
      res.json(await adminService.createPlan(body));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể tạo plan" });
    }
  });

  app.post("/api/admin/plans/:id/update", requireAdmin, async (req, res) => {
    try {
      const body = updatePlanSchema.parse(req.body);
      res.json(await adminService.updatePlan(String(req.params.id ?? ""), body));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể cập nhật plan" });
    }
  });

  app.post("/api/admin/plans/:id/delete", requireAdmin, async (req, res) => {
    try {
      res.json(await adminService.deletePlan(String(req.params.id ?? "")));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể xóa plan" });
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
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể xử lý giao dịch chờ duyệt" });
    }
  });

  app.post("/api/admin/pending/:paymentId/delete", requireAdmin, async (req, res) => {
    try {
      await adminService.deletePendingPayment(String(req.params.paymentId ?? ""));
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể xóa giao dịch chờ duyệt" });
    }
  });

  app.post("/api/admin/orders/:orderId/confirm", requireAdmin, async (req, res) => {
    try {
      const result = await paymentService.confirmManualOrder(String(req.params.orderId ?? ""));
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể xác nhận đơn thủ công" });
    }
  });
}
