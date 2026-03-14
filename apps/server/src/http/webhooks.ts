import type { Express, Request, Response } from "express";

import { env } from "../config.js";
import { verifySepaySignature } from "../lib/sepay.js";
import { PaymentService } from "../services/payment-service.js";

type RawBodyRequest = Request & {
  rawBody?: string;
};

function verifySepayApiKey(authorizationHeader: string | null, apiKey: string) {
  if (!apiKey) {
    return true;
  }

  if (!authorizationHeader) {
    return false;
  }

  const expectedHeader = `Apikey ${apiKey}`;
  return authorizationHeader.trim() === expectedHeader;
}

function parseWebhookPayload(body: unknown) {
  if (body && typeof body === "object") {
    return body;
  }

  if (typeof body !== "string" || !body.trim()) {
    return body;
  }

  const text = body.trim();

  try {
    return JSON.parse(text);
  } catch {
    // Continue to form parsing fallback.
  }

  const params = new URLSearchParams(text);
  if (Array.from(params.keys()).length === 0) {
    return body;
  }

  const data = params.get("data");
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // Keep parsed params object below.
    }
  }

  return Object.fromEntries(params.entries());
}

export function registerWebhookRoutes(app: Express, paymentService: PaymentService) {
  app.post("/api/webhooks/sepay", async (req: RawBodyRequest, res: Response) => {
    const signature =
      req.header("x-sepay-signature") ?? req.header("x-signature") ?? null;
    const authorizationHeader = req.header("authorization") ?? null;

    if (!verifySepayApiKey(authorizationHeader, env.SEPAY_WEBHOOK_API_KEY)) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    if (
      env.SEPAY_WEBHOOK_SECRET &&
      !verifySepaySignature(req.rawBody ?? JSON.stringify(req.body), env.SEPAY_WEBHOOK_SECRET, signature)
    ) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    try {
      const payload = parseWebhookPayload(req.body);
      const result = await paymentService.processWebhook(payload, signature);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Webhook failed",
      });
    }
  });
}
