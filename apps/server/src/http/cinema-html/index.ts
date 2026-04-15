import type { Request, Response } from "express";
import { env } from "../../config.js";
import { getCinemaCss } from "./css/index.js";
import { getCinemaJs } from "./js/index.js";
import { getCinemaHtmlBody } from "./html/layout.js";

export function renderCinemaHtml(_req: Request, res: Response) {
  if (!env.CINEMA_WEB_ENABLED) {
    res.status(404).send("Cinema is disabled.");
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.type("html").send(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <title>VIP Cinema</title>
  <style>${getCinemaCss()}</style>
</head>
<body>${getCinemaHtmlBody()}<script>${getCinemaJs()}</script></body>
</html>`);
}
