import { useEffect, useState } from "react";

import { api } from "../api";
import type { VipStatsResponse } from "../types";
import { currency } from "../utils/format";

export function VipStatsPage() {
  const [data, setData] = useState<VipStatsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<VipStatsResponse>("/api/admin/vip-stats")
      .then(setData)
      .catch((value: Error) => setError(value.message));
  }, []);

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Thống kê VIP</h1>
          <p>Thống kê nhanh trong một lần tải dữ liệu.</p>
        </div>
      </div>
      {error ? (
        <p>Lỗi: {error}</p>
      ) : !data ? (
        <p>Đang tải thống kê...</p>
      ) : (
        <div className="stats">
          <div className="stat-card">
            <span>VIP đang hoạt động</span>
            <strong>{data.activeVipCount}</strong>
          </div>
          <div className="stat-card">
            <span>VIP hết hạn hôm nay</span>
            <strong>{data.expiringTodayCount}</strong>
          </div>
          <div className="stat-card">
            <span>Doanh thu tháng</span>
            <strong>{currency(data.monthlyRevenue)}</strong>
          </div>
        </div>
      )}
    </section>
  );
}

