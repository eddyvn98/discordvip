import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";

import type { AdminUser } from "../../types";
import { DashboardPage } from "../../pages/DashboardPage";
import { MembershipsPage } from "../../pages/MembershipsPage";
import { PendingPage } from "../../pages/PendingPage";
import { PlansPage } from "../../pages/PlansPage";
import { PromoCodesPage } from "../../pages/PromoCodesPage";
import { TelegramChannelsPage } from "../../pages/TelegramChannelsPage";
import { TransactionsPage } from "../../pages/TransactionsPage";
import { VipStatsPage } from "../../pages/VipStatsPage";

type AdminLayoutProps = {
  user: AdminUser;
  onLogout: () => Promise<void>;
};

export function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <button
        className="mobile-menu-button"
        type="button"
        aria-label="Mở menu"
        onClick={() => setMobileSidebarOpen(true)}
      >
        Menu
      </button>
      {mobileSidebarOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <aside className={`sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        <div>
          <p className="eyebrow">Discord VIP</p>
          <h2>Quản trị</h2>
        </div>
        <nav>
          <NavLink to="/" onClick={() => setMobileSidebarOpen(false)}>
            Tổng quan
          </NavLink>
          <NavLink to="/vip-stats" onClick={() => setMobileSidebarOpen(false)}>
            Thống kê VIP
          </NavLink>
          <NavLink to="/transactions" onClick={() => setMobileSidebarOpen(false)}>
            Giao dịch
          </NavLink>
          <NavLink to="/memberships" onClick={() => setMobileSidebarOpen(false)}>
            Thành viên VIP
          </NavLink>
          <NavLink to="/promo-codes" onClick={() => setMobileSidebarOpen(false)}>
            Mã khuyến mãi
          </NavLink>
          <NavLink to="/plans" onClick={() => setMobileSidebarOpen(false)}>
            Plan VIP
          </NavLink>
          <NavLink to="/pending" onClick={() => setMobileSidebarOpen(false)}>
            Chờ xử lý
          </NavLink>
          <NavLink to="/telegram-channels" onClick={() => setMobileSidebarOpen(false)}>
            Kênh Telegram VIP
          </NavLink>
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
          <Route path="/promo-codes" element={<PromoCodesPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/pending" element={<PendingPage />} />
          <Route path="/telegram-channels" element={<TelegramChannelsPage />} />
        </Routes>
      </main>
    </div>
  );
}
