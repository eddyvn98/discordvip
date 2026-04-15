import { useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import type { AdminUser } from "../../types";
import { CinemaPage } from "../../pages/CinemaPage";
import { MembershipsPage } from "../../pages/MembershipsPage";
import { TelegramChannelsPage } from "../../pages/TelegramChannelsPage";

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
          <NavLink to="/memberships" onClick={() => setMobileSidebarOpen(false)}>
            Thành viên VIP
          </NavLink>
          <NavLink to="/telegram-channels" onClick={() => setMobileSidebarOpen(false)}>
            Kênh Telegram VIP
          </NavLink>
          <NavLink to="/cinema" onClick={() => setMobileSidebarOpen(false)}>
            Cinema
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
          <Route path="/" element={<Navigate to="/memberships" replace />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/telegram-channels" element={<TelegramChannelsPage />} />
          <Route path="/cinema" element={<CinemaPage />} />
        </Routes>
      </main>
    </div>
  );
}
