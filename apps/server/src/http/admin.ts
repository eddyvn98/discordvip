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

  app.get("/api/admin/pending", requireAdmin, async (_req, res) => {
    res.json(await adminService.listPendingPayments());
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
        error: error instanceof Error ? error.message : "Resolve failed",
      });
    }
  });

  app.post("/api/admin/pending/:paymentId/delete", requireAdmin, async (req, res) => {
    try {
      await adminService.deletePendingPayment(String(req.params.paymentId ?? ""));
      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Delete pending payment failed",
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

  app.post("/api/admin/memberships/:membershipId/revoke", requireAdmin, async (req, res) => {
    try {
      const result = await adminService.revokeMembership(String(req.params.membershipId ?? ""));
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Revoke membership failed",
      });
    }
  });
}
