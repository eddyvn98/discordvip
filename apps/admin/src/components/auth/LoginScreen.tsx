import { FormEvent, useMemo, useState } from "react";

import { api } from "../../api";

type TabMode = "login" | "request_discord" | "request_telegram";

function requestStatusMessage(raw: string | null) {
  switch (raw) {
    case "submitted_discord":
      return "Đã gửi yêu cầu đăng ký admin bằng Discord. Chờ superadmin hoặc bot duyệt.";
    case "pending_approval":
      return "Tài khoản chưa được duyệt admin. Yêu cầu đã được ghi nhận, vui lòng chờ xét duyệt.";
    case "dev_mode_no_request":
      return "Môi trường dev: bỏ qua luồng đăng ký.";
    default:
      return "";
  }
}

export function LoginScreen() {
  const [debugSecret, setDebugSecret] = useState("");
  const [debugError, setDebugError] = useState("");
  const [tab, setTab] = useState<TabMode>("login");
  const [telegramUserId, setTelegramUserId] = useState("");
  const [telegramDisplayName, setTelegramDisplayName] = useState("");
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramError, setTelegramError] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);

  const debugLoginEnabled = import.meta.env.VITE_ENABLE_DEBUG_LOGIN === "true";
  const oauthRequestHint = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return requestStatusMessage(params.get("adminRequest"));
  }, []);

  async function handleDebugLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDebugError("");

    try {
      const result = await api.debugLogin(debugSecret);
      window.location.href = result.redirectTo;
    } catch (error) {
      setDebugError(error instanceof Error ? error.message : "Debug login failed");
    }
  }

  async function handleTelegramRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTelegramError("");
    setTelegramMessage("");
    setTelegramLoading(true);
    try {
      await api.requestTelegramAdmin({
        telegramUserId: telegramUserId.trim(),
        displayName: telegramDisplayName.trim() || undefined,
      });
      setTelegramMessage("Đã gửi yêu cầu đăng ký Telegram admin. Chờ superadmin hoặc bot duyệt.");
      setTelegramUserId("");
      setTelegramDisplayName("");
    } catch (error) {
      setTelegramError(error instanceof Error ? error.message : "Không thể gửi yêu cầu Telegram");
    } finally {
      setTelegramLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/30">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Discord VIP</p>
        <h1 className="mt-2 text-2xl font-bold">Trang quản trị</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Superadmin duyệt quyền truy cập. Admin con phải gửi yêu cầu trước khi đăng nhập.
        </p>
        {oauthRequestHint ? (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {oauthRequestHint}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === "login" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setTab("request_discord")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === "request_discord" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Đăng ký Discord
          </button>
          <button
            type="button"
            onClick={() => setTab("request_telegram")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === "request_telegram" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Đăng ký Telegram
          </button>
        </div>

        {tab === "login" ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">Dành cho tài khoản đã được duyệt quyền admin.</p>
            <a
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
              href={api.loginUrl("login")}
            >
              Đăng nhập với Discord
            </a>
          </div>
        ) : null}

        {tab === "request_discord" ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Bấm nút để đăng nhập Discord và tạo yêu cầu admin con. Sau khi superadmin duyệt, bạn dùng tab Đăng nhập.
            </p>
            <a
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
              href={api.loginUrl("request")}
            >
              Gửi yêu cầu admin bằng Discord
            </a>
          </div>
        ) : null}

        {tab === "request_telegram" ? (
          <form onSubmit={handleTelegramRequest} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Nhập Telegram User ID để gửi yêu cầu. Superadmin có thể duyệt trong trang “Duyệt admin”.
            </p>
            <input
              type="text"
              value={telegramUserId}
              onChange={(event) => setTelegramUserId(event.target.value)}
              placeholder="Telegram User ID (vd: 123456789)"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={telegramDisplayName}
              onChange={(event) => setTelegramDisplayName(event.target.value)}
              placeholder="Tên hiển thị (tuỳ chọn)"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:opacity-95 transition-opacity disabled:opacity-50"
              type="submit"
              disabled={telegramLoading}
            >
              {telegramLoading ? "Đang gửi..." : "Gửi yêu cầu Telegram"}
            </button>
            {telegramMessage ? <p className="text-xs text-primary">{telegramMessage}</p> : null}
            {telegramError ? <p className="text-xs text-destructive">{telegramError}</p> : null}
          </form>
        ) : null}

        {debugLoginEnabled ? (
          <form onSubmit={handleDebugLogin} className="mt-6 border-t border-border pt-5 space-y-3">
            <p className="text-xs text-muted-foreground">Debug login (chỉ dev/staging).</p>
            <input
              type="password"
              value={debugSecret}
              onChange={(event) => setDebugSecret(event.target.value)}
              placeholder="Nhập debug secret"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:opacity-95 transition-opacity"
              type="submit"
            >
              Debug Login
            </button>
            {debugError ? <p className="text-xs text-destructive">{debugError}</p> : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
