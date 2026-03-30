import type { Express, NextFunction, Request, Response } from "express";

import { registerAdminCommerceRoutes } from "./admin-commerce-routes.js";
import { registerAdminMembershipRoutes } from "./admin-membership-routes.js";
import { registerAdminReferralRoutes } from "./admin-referral-routes.js";
import { registerAdminTelegramRoutes } from "./admin-telegram-routes.js";
import { AdminService } from "../services/admin-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PromoCodeService } from "../services/promo-code-service.js";

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

  app.get("/api/admin/summary", requireAdmin, async (req, res) => {
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
    res.json(await paymentService.getDashboardSummary(platform));
  });

  app.get("/api/admin/vip-stats", requireAdmin, async (_req, res) => {
    res.json(await adminService.getVipStats());
  });

  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
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

  registerAdminMembershipRoutes(app, adminService, requireAdmin);
  registerAdminCommerceRoutes(app, adminService, paymentService, promoCodeService, requireAdmin);
  registerAdminTelegramRoutes(app, adminService, requireAdmin);
  registerAdminReferralRoutes(app, adminService, requireAdmin);
}
