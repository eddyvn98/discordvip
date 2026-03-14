import { FormEvent, useState } from "react";

import { api } from "../../api";

export function LoginScreen() {
  const [debugSecret, setDebugSecret] = useState("");
  const [debugError, setDebugError] = useState("");
  const debugLoginEnabled = import.meta.env.VITE_ENABLE_DEBUG_LOGIN === "true";

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

  return (
    <div className="login-shell">
      <div className="card login-card">
        <p className="eyebrow">Discord VIP</p>
        <h1>Trang quản trị</h1>
        <p>
          Đăng nhập bằng tài khoản Discord nằm trong danh sách cho phép hoặc có
          vai trò quản trị.
        </p>
        <a className="button" href={api.loginUrl()}>
          Đăng nhập với Discord
        </a>
        {debugLoginEnabled ? (
          <form onSubmit={handleDebugLogin}>
            <p>Hoặc dùng debug login cho môi trường dev/staging.</p>
            <input
              type="password"
              value={debugSecret}
              onChange={(event) => setDebugSecret(event.target.value)}
              placeholder="Nhập debug secret"
            />
            <button className="button" type="submit">
              Debug Login
            </button>
            {debugError ? <p>{debugError}</p> : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
