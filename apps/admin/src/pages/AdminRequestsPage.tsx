import { useEffect, useState } from "react";

import { api } from "../api";
import type { AdminRequestItem } from "../types";

export function AdminRequestsPage() {
  const [items, setItems] = useState<AdminRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api.get<AdminRequestItem[]>("/api/admin/cinema/access/requests");
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: string) => {
    setError("");
    setMessage("");
    try {
      await api.post(`/api/admin/cinema/access/requests/${id}/approve`, { defaultGlobalView: true });
      setMessage("Đã duyệt yêu cầu admin.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không duyệt được yêu cầu.");
    }
  };

  const reject = async (id: string) => {
    if (!window.confirm("Từ chối và xoá yêu cầu này?")) return;
    setError("");
    setMessage("");
    try {
      await api.post(`/api/admin/cinema/access/requests/${id}/reject`, {});
      setMessage("Đã từ chối yêu cầu admin.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không từ chối được yêu cầu.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Duyệt admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Superadmin duyệt yêu cầu đăng ký admin con từ Discord/Telegram.
        </p>
      </div>

      {message ? <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</div> : null}
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">User ID</th>
              <th className="px-3 py-2">Tên hiển thị</th>
              <th className="px-3 py-2">Tạo lúc</th>
              <th className="px-3 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={5}>Đang tải...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={5}>Không có yêu cầu chờ duyệt.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-semibold">{item.platform}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.platformUserId}</td>
                  <td className="px-3 py-2">{item.displayName || "-"}</td>
                  <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void approve(item.id)}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => void reject(item.id)}
                        className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
