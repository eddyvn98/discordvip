import type { Response } from "express";

export function renderEntryBootstrapHtml(entryTicket: string, res: Response) {
  const escapedTicket = entryTicket.replace(/"/g, "");
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VIP Cinema</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>body{font-family:Segoe UI,Arial,sans-serif;background:#090b10;color:#eef2ff;padding:24px} .box{max-width:560px;margin:20px auto;background:#121722;border:1px solid #263247;border-radius:12px;padding:16px} .muted{color:#9aa9c7}</style>
</head>
<body>
  <div class="box">
    <h2>VIP Cinema</h2>
    <p class="muted" id="msg">Dang xac thuc phien truy cap...</p>
  </div>
  <script>
    (async function(){
      const msg = document.getElementById('msg');
      const tg = window.Telegram && window.Telegram.WebApp;
      let initData = tg && tg.initData ? tg.initData : '';
      if (!initData) {
        const qp = new URLSearchParams(location.search);
        initData = qp.get('tgWebAppData') || '';
      }
      if (!initData) {
        msg.textContent = 'Khong tim thay Telegram WebApp session. Hay mo lai tu nut trong bot.';
        return;
      }
      try {
        const r = await fetch('/api/cinema/session/exchange-ticket', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify({ entryTicket: "${escapedTicket}", initData }),
        });
        const data = await r.json().catch(()=>({}));
        if (!r.ok) throw new Error(data.error || ('HTTP '+r.status));
        location.replace('/api/cinema');
      } catch (e) {
        msg.textContent = (e && e.message) ? e.message : 'Xac thuc that bai. Hay mo lai tu bot.';
      }
    })();
  </script>
</body>
</html>`);
}
