import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { TransactionItem } from "../types";
import { currency, datetime, formatPlatformUser } from "../utils/format";

const PAGE_TITLE = "Giao dịch";
const PAGE_DESC = "Lịch sử thanh toán và trạng thái khớp đơn.";
const MSG_LOADING = "Đang tải...";
const MSG_SEARCH = "Tìm kiếm";
const MSG_RESET = "Đặt lại";

export function TransactionsPage() {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<"discord" | "telegram" | "all">("discord");
  const [search, setSearch] = useState("");

  const load = async (query = "") => {
    setError("");
    setLoading(true);

    const path = query.trim()
      ? `/api/admin/transactions/search?q=${encodeURIComponent(query.trim())}&platform=${platform}`
      : `/api/admin/transactions?platform=${platform}`;

    try {
      const data = await api.get<TransactionItem[]>(path);
      setItems(data);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load(search);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [platform, search]);

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>{PAGE_TITLE}</h1>
          <p>{PAGE_DESC}</p>
        </div>
        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value as "discord" | "telegram" | "all")}
        >
          <option value="discord">Discord</option>
          <option value="telegram">Telegram</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load(search);
        }}
        style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo mã giao dịch, mã đơn, user ID/tên, gói mua"
          style={{
            minWidth: "320px",
            flex: 1,
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            background: "#0f172a",
            color: "#fff",
          }}
        />
        <button className="button" type="submit" disabled={loading}>
          {loading ? MSG_LOADING : MSG_SEARCH}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            setSearch("");
            void load("");
          }}
        >
          {MSG_RESET}
        </button>
      </form>

      {error ? (
        <p>Lỗi: {error}</p>
      ) : (
        <Table
          headers={[
            "Thời gian",
            "Mã GD",
            "Số tiền",
            "Người gửi",
            "Nội dung CK",
            "Mã đơn",
            "Người mua",
            "Gói mua",
            "Trạng thái",
          ]}
          rows={items.map((item) => [
            datetime(item.createdAt),
            item.providerTransactionId,
            currency(item.amount),
            item.payerName ?? "-",
            item.transferContent ?? "-",
            item.order?.orderCode ?? "-",
            item.order
              ? formatPlatformUser({
                  platform: item.order.platform,
                  platformUserId: item.order.platformUserId,
                  discordDisplayName: item.order.discordDisplayName,
                })
              : "-",
            item.order?.plan?.name ?? "-",
            item.status,
          ])}
        />
      )}
    </section>
  );
}
