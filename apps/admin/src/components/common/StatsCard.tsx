import type { ReactNode } from "react";

type StatsCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
};

export function StatsCard({ label, value, icon, description, trend }: StatsCardProps) {
  return (
    <div className="stats-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="label">{label}</span>
        {icon && <div style={{ color: "var(--primary)" }}>{icon}</div>}
      </div>
      <div className="value">{value}</div>
      {description && <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{description}</p>}
      {trend && (
        <div style={{ fontSize: "12px", display: "flex", gap: "4px", color: trend.isUp ? "#10b981" : "#ef4444" }}>
          <span>{trend.isUp ? "↑" : "↓"} {trend.value}%</span>
          <span style={{ color: "var(--muted-foreground)" }}>so với tháng trước</span>
        </div>
      )}
    </div>
  );
}
