import { NavLink, Route, Routes } from "react-router-dom";

import type { AdminUser } from "../../types";
import { DashboardPage } from "../../pages/DashboardPage";
import { MembershipsPage } from "../../pages/MembershipsPage";
import { PendingPage } from "../../pages/PendingPage";
import { TransactionsPage } from "../../pages/TransactionsPage";
import { VipStatsPage } from "../../pages/VipStatsPage";

type AdminLayoutProps = {
  user: AdminUser;
  onLogout: () => Promise<void>;
};

export function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Discord VIP</p>
          <h2>Quản trị</h2>
        </div>
        <nav>
          <NavLink to="/">Tổng quan</NavLink>
          <NavLink to="/vip-stats">Thống kê VIP</NavLink>
          <NavLink to="/transactions">Giao dịch</NavLink>
          <NavLink to="/memberships">Thành viên VIP</NavLink>
          <NavLink to="/pending">Chờ xử lý</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} /> : <div className="avatar" />}
            <div>
              <strong>{user.username}</strong>
              <p>{user.id}</p>
            </div>
          </div>
          <button className="button secondary" onClick={() => void onLogout()}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/vip-stats" element={<VipStatsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/pending" element={<PendingPage />} />
        </Routes>
      </main>
    </div>
  );
}
