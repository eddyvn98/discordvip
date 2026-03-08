import type { Express, Request, Response } from "express";

import { env } from "../config.js";
import { verifySepaySignature } from "../lib/sepay.js";
import { PaymentService } from "../services/payment-service.js";

type RawBodyRequest = Request & {
  rawBody?: string;
};

export function registerWebhookRoutes(app: Express, paymentService: PaymentService) {
  app.post("/api/webhooks/sepay", async (req: RawBodyRequest, res: Response) => {
    const signature =
      req.header("x-sepay-signature") ?? req.header("x-signature") ?? null;

    if (
      env.SEPAY_WEBHOOK_SECRET &&
      !verifySepaySignature(req.rawBody ?? JSON.stringify(req.body), env.SEPAY_WEBHOOK_SECRET, signature)
    ) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    try {
      const result = await paymentService.processWebhook(req.body, signature);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook failed",
      });
    }
  });
}
