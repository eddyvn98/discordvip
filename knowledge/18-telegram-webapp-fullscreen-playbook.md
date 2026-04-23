# Telegram WebApp Fullscreen Playbook

**Tags:** `telegram-webapp` `fullscreen` `orientation` `player` `cinema` `one-time-link`

## Concept
Đây là playbook để giữ luồng fullscreen ổn định khi mở web phim từ Telegram WebApp (đặc biệt với link dùng 1 lần).

Mục tiêu:
- Mở đúng từ bot -> vào webview -> xác thực ticket -> vào player.
- Xoay ngang điện thoại tự vào fullscreen mode.
- Toàn bộ playback controls nằm trong player surface (không có mini/floating controls bên ngoài).

## When to use
- Dự án có mở web từ Telegram bot (`web_app` button hoặc one-time entry URL).
- Player cần auto fullscreen theo xoay ngang.
- Có vấn đề kiểu "xoay ngang không full", "vẫn còn header/bottom bar", "mất session khi vào webview".

## When NOT to use
- Website không chạy trong Telegram WebView.
- Player không yêu cầu auto fullscreen theo orientation.
- App native (iOS/Android) đã tự xử lý fullscreen bên client native.

## Reference flow (must-have)
1. Bot tạo one-time entry URL (ví dụ `/api/cinema/e/:entryTicket`).
2. Route entry trả bootstrap HTML.
3. Bootstrap lấy `Telegram.WebApp.initData`.
4. Bootstrap gọi `POST /api/cinema/session/exchange-ticket`.
5. Server verify `initData` + verify ticket.
6. Set session cookie (`SameSite=None`, `Secure` khi production).
7. Redirect vào page player thật (`/api/cinema`).
8. JS player đăng ký `orientationchange`/`screen.orientation.change`/`resize`.
9. Khi landscape: bật pseudo-fullscreen class + Telegram request fullscreen nếu có.

## Critical backend pieces
### 1) Entry bootstrap route
Không render player trực tiếp tại `/api/cinema/e/:ticket`.
Phải render bootstrap HTML để exchange ticket trước.

File tham chiếu:
- [cinema.ts](/D:/discordvip-cinema-web/apps/server/src/http/cinema.ts)
- [cinema-bootstrap-html.ts](/D:/discordvip-cinema-web/apps/server/src/http/cinema-bootstrap-html.ts)

### 2) Ticket exchange endpoint
Endpoint mẫu:
- `POST /api/cinema/session/exchange-ticket`

Yêu cầu:
- Rate limit theo IP.
- Verify chữ ký Telegram `initData`.
- Verify ticket status (`ACTIVE`, chưa hết hạn, chưa bị dùng bởi fingerprint khác).
- Set session `req.session.cinemaUser`.

### 3) Session cookie cho Telegram WebView
Trong production:
- `sameSite: "none"`
- `secure: true`
- `httpOnly: true`

Nếu sai `sameSite/secure`, Telegram WebView thường exchange ticket xong nhưng request sau vẫn mất session.

File tham chiếu:
- [app.ts](/D:/discordvip-cinema-web/apps/server/src/http/app.ts)

## Critical frontend pieces
### 1) Bootstrap fullscreen/orientation phải nằm trong bundle thật
Lỗi rất hay gặp: có viết `scheduleOrientationCheck()` nhưng file đó không được ghép vào bundle chạy thực tế.

Ở repo này, bundle ghép qua:
- [js/index.ts](/D:/discordvip-cinema-web/apps/server/src/http/cinema-html/js/index.ts)

Đảm bảo file chứa listener orientation thật sự nằm trong chuỗi `getCinemaJs()`.

### 2) Orientation listeners bắt buộc
Tối thiểu cần 3 listener:
- `orientationchange`
- `screen.orientation.change` (nếu có)
- `resize`

Ví dụ đang dùng:
- [chunk6.ts](/D:/discordvip-cinema-web/apps/server/src/http/cinema-html/js/chunk6.ts#L419)

### 3) Fullscreen toggle logic
`onOrientationLikeChange()` cần:
- Nếu landscape + đang xem item -> `togglePseudoFullscreen(true)`
- Nếu portrait + trước đó auto bật -> `togglePseudoFullscreen(false)`

`togglePseudoFullscreen(true)` nên:
- `document.body.classList.add("fullscreen-mode")`
- `dom.playerWrap.classList.add("pseudo-fullscreen")`
- `tg.requestFullscreen()` (nếu Telegram hỗ trợ)
- `tg.unlockOrientation()` + `screen.orientation.unlock()` (best effort)

## Copy-ready snippets
### A) Orientation bootstrap snippet
```ts
function scheduleOrientationCheck() {
  if (state.orientTimer) clearTimeout(state.orientTimer);
  state.orientTimer = setTimeout(() => {
    onOrientationLikeChange();
    if (state.isPip && state.pipRect) applyPipRect(state.pipRect);
    updatePipButtons();
    updatePlaybackDock();
  }, 200);
}

window.addEventListener("orientationchange", scheduleOrientationCheck, { passive: true });
if (screen && screen.orientation) {
  screen.orientation.addEventListener("change", scheduleOrientationCheck);
}
window.addEventListener("resize", scheduleOrientationCheck, { passive: true });
```

### B) Bootstrap exchange ticket snippet
```ts
const tg = window.Telegram && window.Telegram.WebApp;
let initData = (tg && tg.initData) || "";
if (!initData) {
  const qp = new URLSearchParams(location.search);
  initData = qp.get("tgWebAppData") || "";
}
if (!initData) throw new Error("Missing Telegram initData");

await fetch("/api/cinema/session/exchange-ticket", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ entryTicket, initData }),
});
location.replace("/api/cinema");
```

## No-regression UX constraints
- Không render playback controls bên ngoài player surface.
- Không dùng mini dock/floating dock làm control chính khi fullscreen.
- Nếu màn nhỏ không đủ chỗ: responsive lại control bên trong player, không đẩy ra ngoài.

## Fast diagnosis checklist
1. Bấm link từ bot, check có hit `/api/cinema/e/:ticket` không.
2. Check bootstrap có gọi `exchange-ticket` và trả `200` không.
3. Check cookie response có `SameSite=None; Secure` (production) không.
4. Check request `/api/cinema/session/me` sau đó có `200` không.
5. Check HTML/bundle live có chứa `scheduleOrientationCheck` không.
6. Xoay ngang trên Telegram Android/iOS, check `fullscreen-mode`/`pseudo-fullscreen` class có bật không.
7. Nếu không mở được link ngay từ đầu: check tunnel/domain còn sống không (DNS + HTTP 200).

## Common failures and exact fixes
- Symptom: "Bấm nút Telegram không mở được web"
  - Root cause: tunnel URL chết hoặc bot/menu đang giữ URL cũ.
  - Fix: rotate tunnel, cập nhật runtime base URL, sync lại menu button.

- Symptom: "Vào web được nhưng báo thiếu session"
  - Root cause: cookie policy sai (`sameSite`/`secure`) hoặc exchange ticket không chạy.
  - Fix: sửa cấu hình session cookie, xác nhận bootstrap gọi `exchange-ticket`.

- Symptom: "Xoay ngang không full màn"
  - Root cause: orientation listener không nằm trong bundle runtime.
  - Fix: đưa listener vào file đang được `getCinemaJs()` ghép thật.

- Symptom: "Đã có fullscreen logic trong source nhưng UI không đổi"
  - Root cause: chỉnh sai file nguồn không được serve, hoặc container chưa rebuild.
  - Fix: rebuild service đúng stack đang chạy, kiểm tra HTML đã chứa đoạn JS mới.

## Apply to new project (10-minute port)
1. Port 3 route:
   - `GET /api/cinema/e/:ticket`
   - `POST /api/cinema/session/exchange-ticket`
   - `GET /api/cinema` (player page)
2. Port Telegram `initData` verify function.
3. Port session cookie policy cho Telegram WebView.
4. Port orientation bootstrap snippet vào bundle runtime.
5. Port `togglePseudoFullscreen` class strategy (`fullscreen-mode`, `pseudo-fullscreen`).
6. Test theo checklist ở trên với một link one-time mới tạo.

## Definition of done
- Link mới gửi từ bot mở được trong Telegram.
- Exchange ticket thành công và giữ session ổn định.
- Xoay ngang vào fullscreen như kỳ vọng.
- Controls vẫn ở trong player surface.
- Không xuất hiện lỗi 401 session/invalid ticket trong flow bình thường.
