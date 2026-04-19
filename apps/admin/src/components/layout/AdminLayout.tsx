import { useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  Bell,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Search as SearchIcon,
  Settings,
  Tv,
  Users,
  X,
} from "lucide-react";

import type { AdminUser } from "../../types";
import { AdminRequestsPage } from "../../pages/AdminRequestsPage";
import { CinemaChannelsPage } from "../../pages/CinemaChannelsPage";
import { CinemaPage } from "../../pages/CinemaPage";
import { MembershipsPage } from "../../pages/MembershipsPage";
import { TelegramChannelsPage } from "../../pages/TelegramChannelsPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AdminLayoutProps = {
  user: AdminUser;
  onLogout: () => Promise<void>;
};

export function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/memberships":
        return "Thành viên VIP";
      case "/telegram-channels":
        return "Kênh Telegram";
      case "/cinema":
        return "Cinema Workspace";
      case "/cinema-channels":
        return "Kênh Phim";
      case "/admin-requests":
        return "Duyệt Admin";
      default:
        return "Dashboard";
    }
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/memberships", label: "Thành viên VIP", icon: Users },
    { to: "/telegram-channels", label: "Kênh Telegram", icon: Tv },
    { to: "/cinema", label: "Cinema Workspace", icon: Film },
    { to: "/cinema-channels", label: "Kênh Phim", icon: MonitorPlay },
    { to: "/admin-requests", label: "Duyệt Admin", icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-0 lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-8 text-primary">
            <Film size={28} />
            <span className="text-xl font-bold">Cinema VIP</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="pt-6 mt-auto space-y-1 border-t">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
              <Settings size={20} /> Cài đặt
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void onLogout()}
            >
              <LogOut size={20} /> Đăng xuất
            </Button>

            <div className="flex items-center gap-3 p-3 mt-4 rounded-lg bg-accent/50">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground">Admin Platform</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-background/80 backdrop-blur-sm border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              {mobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
            <div className="text-sm text-muted-foreground">
              Admin / <span className="font-semibold text-foreground">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:flex items-center">
              <SearchIcon size={18} className="absolute left-3 text-muted-foreground pointer-events-none" />
              <Input type="text" placeholder="Tìm kiếm..." className="pl-10 w-64 h-9 bg-accent/30" />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
            </Button>
          </div>
        </header>

        <main className="p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/memberships" replace />} />
            <Route path="/memberships" element={<MembershipsPage />} />
            <Route path="/telegram-channels" element={<TelegramChannelsPage />} />
            <Route path="/cinema" element={<CinemaPage />} />
            <Route path="/cinema-channels" element={<CinemaChannelsPage />} />
            <Route path="/admin-requests" element={<AdminRequestsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
