import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { SummaryResponse } from "../types";
import { currency, datetime, formatPlatformUser } from "../utils/format";

export function DashboardPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState<"discord" | "telegram" | "all">("discord");

  useEffect(() => {
    api
      .get<SummaryResponse>(`/api/admin/summary?platform=${platform}`)
      .then(setData)
      .catch((value: Error) => setError(value.message));
  }, [platform]);

  if (error) {
    return <div className="card">Lỗi: {error}</div>;
  }

  if (!data) {
    return <div className="card">Đang tải tổng quan...</div>;
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="section-header">
          <h1>Tổng quan</h1>
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as "discord" | "telegram" | "all")}
          >
            <option value="discord">Discord</option>
            <option value="telegram">Telegram</option>
            <option value="all">Tất cả</option>
          </select>
        </div>

        <div className="stats">
          <div className="stat-card">
            <span>Doanh thu khớp VIP paid</span>
            <strong>{currency(data.revenue)}</strong>
          </div>
          <div className="stat-card">
            <span>VIP đang hoạt động</span>
            <strong>{data.activeMemberships}</strong>
          </div>
          <div className="stat-card">
            <span>Chờ duyệt</span>
            <strong>{data.pendingCount}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Thanh toán gần đây</h2>
            <p>Phạm vi: {data.platform.toUpperCase()}</p>
          </div>
        </div>
        <Table
          headers={["Thời gian", "Mã GD", "Số tiền", "Trạng thái", "Đơn hàng"]}
          rows={data.recentPayments.map((item) => [
            datetime(item.createdAt),
            item.providerTransactionId,
            currency(item.amount),
            item.status,
            item.order
              ? `${item.order.orderCode} - ${formatPlatformUser({
                  platform: item.order.platform,
                  platformUserId: item.order.platformUserId,
                  discordDisplayName: item.order.discordDisplayName,
                })}`
              : "-",
          ])}
        />
      </section>
    </div>
  );
}
