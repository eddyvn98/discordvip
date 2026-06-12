import { useEffect, useState } from "react";
import { api } from "../api";
import type { MonthlyRevenueResponse } from "../types";
import { currency, datetime } from "../utils/format";

export function RevenueStatsPage() {
  const [data, setData] = useState<MonthlyRevenueResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "discord" | "telegram">("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    const path = selectedMonth ? `/api/admin/monthly-revenue?month=${selectedMonth}` : "/api/admin/monthly-revenue";
    api
      .get<MonthlyRevenueResponse>(path)
      .then((res) => {
        setData(res);
        if (!selectedMonth) {
          setSelectedMonth(res.selectedMonth);
        }
        setError("");
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedMonth]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
  };

  const filteredMembers = data
    ? data.members.filter((m) => {
        if (platformFilter === "all") return true;
        return m.platform === platformFilter;
      })
    : [];

  return (
    <div className="stack">
      <section className="card vip-stats-hero">
        <div className="vip-stats-hero-copy" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p className="eyebrow">Financial Analytics</p>
            <h1 style={{ margin: "0 0 10px" }}>Doanh thu theo tháng</h1>
            <p style={{ margin: 0, color: "#cbd5e1" }}>Thống kê doanh thu thực tế nhận được và danh sách thành viên mua VIP tương ứng.</p>
          </div>
          
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>Chọn tháng:</span>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.28)",
                background: "#0f172a",
                color: "white",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {data?.availableMonths.map((m) => {
                const parts = m.split("-");
                const label = `Tháng ${parts[1]}/${parts[0]}`;
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}>
          <p className="error">Lỗi: {error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="card">
          <p>Đang tải dữ liệu doanh thu...</p>
        </div>
      ) : data ? (
        <>
          <div className="stats stats-wide">
            <div className="stat-card stat-card-accent">
              <span>Tổng doanh thu</span>
              <strong>{currency(data.totalRevenue)}</strong>
              <small>Tháng {data.selectedMonth.split("-")[1]}/{data.selectedMonth.split("-")[0]}</small>
            </div>
            
            <div className="stat-card">
              <span>Doanh thu Discord</span>
              <strong>{currency(data.byPlatform.discord)}</strong>
              <small>Từ các đơn hàng được duyệt tự động và thủ công</small>
            </div>

            <div className="stat-card">
              <span>Doanh thu Telegram</span>
              <strong>{currency(data.byPlatform.telegram)}</strong>
              <small>Từ các kênh Telegram VIP liên kết</small>
            </div>

            <div className="stat-card">
              <span>Số lượt mua VIP</span>
              <strong>{data.members.length}</strong>
              <small>Tổng số giao dịch thành công</small>
            </div>
          </div>

          <section className="card">
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0 }}>Danh sách thành viên mua VIP</h2>
                <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
                  Danh sách chi tiết thành viên mua VIP trong tháng {data.selectedMonth.split("-")[1]}/{data.selectedMonth.split("-")[0]}.
                </p>
              </div>

              <div style={{ display: "flex", gap: "6px", background: "rgba(15, 23, 42, 0.5)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(148, 163, 184, 0.12)" }}>
                <button
                  type="button"
                  onClick={() => setPlatformFilter("all")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: platformFilter === "all" ? "#2563eb" : "transparent",
                    color: platformFilter === "all" ? "white" : "#cbd5e1",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.15s ease"
                  }}
                >
                  Tất cả ({data.members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformFilter("discord")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: platformFilter === "discord" ? "#2563eb" : "transparent",
                    color: platformFilter === "discord" ? "white" : "#cbd5e1",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.15s ease"
                  }}
                >
                  Discord ({data.members.filter(m => m.platform === "discord").length})
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformFilter("telegram")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: platformFilter === "telegram" ? "#2563eb" : "transparent",
                    color: platformFilter === "telegram" ? "white" : "#cbd5e1",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.15s ease"
                  }}
                >
                  Telegram ({data.members.filter(m => m.platform === "telegram").length})
                </button>
              </div>
            </div>

            {loading && (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#cbd5e1" }}>
                Đang cập nhật danh sách...
              </div>
            )}

            {!loading && filteredMembers.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
                Không có thành viên mua VIP nào trong tháng này cho nền tảng đã chọn.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Nền tảng</th>
                      <th>Gói VIP</th>
                      <th>Số tiền</th>
                      <th>Mã đơn hàng</th>
                      <th>Thời gian thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <div style={{ fontWeight: "600", color: "#f8fafc" }}>
                            {member.username}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                            ID: {member.platformUserId}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: member.platform === "discord" ? "rgba(88, 101, 242, 0.15)" : "rgba(34, 158, 217, 0.15)",
                              color: member.platform === "discord" ? "#5865f2" : "#229ed9",
                              border: `1px solid ${member.platform === "discord" ? "rgba(88, 101, 242, 0.3)" : "rgba(34, 158, 217, 0.3)"}`
                            }}
                          >
                            {member.platform === "discord" ? "Discord" : "Telegram"}
                          </span>
                        </td>
                        <td>{member.planName}</td>
                        <td style={{ fontWeight: "600", color: "#86efac" }}>
                          {currency(member.amount)}
                        </td>
                        <td>
                          <code style={{ background: "rgba(15, 23, 42, 0.6)", padding: "2px 6px", borderRadius: "4px", fontSize: "13px", color: "#cbd5e1" }}>
                            {member.orderCode}
                          </code>
                        </td>
                        <td>{datetime(member.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
