import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { SummaryResponse } from "../types";
import { currency, datetime, formatDiscordUser } from "../utils/format";

export function DashboardPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<SummaryResponse>("/api/admin/summary")
      .then(setData)
      .catch((value: Error) => setError(value.message));
  }, []);

  if (error) {
    return <div className="card">Lỗi: {error}</div>;
  }

  if (!data) {
    return <div className="card">Đang tải tổng quan...</div>;
  }

  return (
    <div className="stack">
      <section className="card">
        <h1>Tổng quan</h1>
        <div className="stats">
          <div className="stat-card">
            <span>Doanh thu</span>
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
            <p>Máy chủ: {data.guildId}</p>
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
              ? `${item.order.orderCode} - ${formatDiscordUser(
                  item.order.discordUserId,
                  item.order.discordDisplayName,
                )}`
              : "-",
          ])}
        />
      </section>
    </div>
  );
}

