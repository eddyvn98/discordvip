import { api } from "../../api";

export function LoginScreen() {
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
      </div>
    </div>
  );
}

