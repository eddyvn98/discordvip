import { useEffect, useState } from "react";

import { api } from "../api";
import type { VipStatsResponse } from "../types";
import { currency } from "../utils/format";

type CompactMetricProps = {
  label: string;
  value: number | string;
  tone?: "default" | "accent";
  note?: string;
};

type InlineMetricProps = {
  label: string;
  value: number | string;
};

function CompactMetric({ label, value, tone = "default", note }: CompactMetricProps) {
  return (
    <div className={`vip-metric ${tone === "accent" ? "vip-metric-accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function InlineMetric({ label, value }: InlineMetricProps) {
  return (
    <div className="vip-inline-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

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
    <div className="stack">
      <section className="card vip-stats-hero">
        <div className="vip-stats-hero-copy">
          <p className="eyebrow">VIP Analytics</p>
          <h1>Thống kê VIP</h1>
          <p>
            Gom theo nền tảng, nguồn VIP và số sắp hết hạn trong {data?.expiringSoonDays ?? 3} ngày
            tới.
          </p>
        </div>
        {data ? (
          <div className="vip-stats-hero-badges">
            {data.platforms.map((platform) => (
              <div className="vip-badge" key={platform.platform}>
                <span>{platform.label}</span>
                <strong>{platform.activeTotal}</strong>
                <small>VIP đang hoạt động</small>
              </div>
            ))}
          </div>
        ) : null}
        {error ? <p className="error">Lỗi: {error}</p> : !data ? <p>Đang tải thống kê...</p> : null}
      </section>

      {data?.platforms.map((platform) => (
        <section className="card vip-platform-card" key={platform.platform}>
          <div className="vip-platform-header">
            <div>
              <h2>{platform.label}</h2>
              <p>Chỉ số được gom gọn để dễ đối chiếu nhanh trên cả desktop lẫn mobile.</p>
            </div>
            <div className="vip-platform-pill">{platform.activeTotal} active</div>
          </div>

          <div className="vip-inline-grid">
            <InlineMetric label="Tổng VIP" value={platform.activeTotal} />
            <InlineMetric label="Trial hoạt động" value={platform.trialActiveCount} />
            <InlineMetric label="Paid hoạt động" value={platform.paidActiveCount} />
            <InlineMetric label="Manual hoạt động" value={platform.manualActiveCount} />
            <InlineMetric label="Trial sắp hết hạn" value={platform.trialExpiringSoonCount} />
            <InlineMetric label="Paid sắp hết hạn" value={platform.paidExpiringSoonCount} />
          </div>

          <div className="vip-detail-grid">
            <div className="vip-cluster vip-cluster-accent">
              <div className="vip-cluster-heading">
                <h3>Doanh thu</h3>
                <p>Tách riêng doanh thu khớp với VIP paid hiện tại và tổng lịch sử.</p>
              </div>
              <div className="vip-cluster-grid">
                <CompactMetric
                  label="Khớp VIP paid hiện tại"
                  value={currency(platform.activePaidAlignedRevenue)}
                  tone="accent"
                  note={`${platform.activePaidMatchedUserCount}/${platform.activePaidUserCount} VIP paid có giao dịch hợp lệ`}
                />
                <CompactMetric
                  label="Tổng lịch sử đã nhận"
                  value={currency(platform.revenueReceivedTotal)}
                  tone="accent"
                  note={`${platform.matchedPaymentCountTotal} giao dịch MATCHED đã ghi nhận`}
                />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
