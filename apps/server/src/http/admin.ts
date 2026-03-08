import type { Express, NextFunction, Request, Response } from "express";

import { AdminService } from "../services/admin-service.js";
import { PaymentService } from "../services/payment-service.js";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

export function registerAdminRoutes(
  app: Express,
  adminService: AdminService,
  paymentService: PaymentService,
) {
  app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({ user: req.session.adminUser });
  });

  app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
    res.json(await paymentService.getDashboardSummary());
  });

  app.get("/api/admin/transactions", requireAdmin, async (_req, res) => {
    res.json(await adminService.listTransactions());
  });

  app.get("/api/admin/memberships", requireAdmin, async (_req, res) => {
    res.json(await adminService.listMemberships());
  });

  app.get("/api/admin/pending", requireAdmin, async (_req, res) => {
    res.json(await adminService.listPendingPayments());
  });

  app.get("/api/admin/orders/pending", requireAdmin, async (_req, res) => {
    res.json(await adminService.listPendingOrders());
  });

  app.get("/api/admin/orders/search", requireAdmin, async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) {
      res.json([]);
      return;
    }

    res.json(await adminService.searchOrders(query));
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
        error: error instanceof Error ? error.message : "Resolve failed",
      });
    }
  });

  app.post("/api/admin/orders/:orderId/confirm", requireAdmin, async (req, res) => {
    try {
      const result = await paymentService.confirmManualOrder(String(req.params.orderId ?? ""));
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Manual confirm failed",
      });
    }
  });
}
