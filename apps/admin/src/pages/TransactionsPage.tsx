import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { TransactionItem } from "../types";
import { currency, datetime, formatDiscordUser } from "../utils/format";

export function TransactionsPage() {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<TransactionItem[]>("/api/admin/transactions")
      .then(setItems)
      .catch((value: Error) => setError(value.message));
  }, []);

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Giao dịch</h1>
          <p>Lịch sử thanh toán và trạng thái khớp đơn.</p>
        </div>
      </div>
      {error ? (
        <p>Lỗi: {error}</p>
      ) : (
        <Table
          headers={[
            "Thời gian",
            "Mã GD",
            "Số tiền",
            "Người gửi",
            "Nội dung",
            "Đơn hàng",
            "Trạng thái",
          ]}
          rows={items.map((item) => [
            datetime(item.createdAt),
            item.providerTransactionId,
            currency(item.amount),
            item.payerName ?? "-",
            item.transferContent ?? "-",
            item.order
              ? `${item.order.orderCode} - ${formatDiscordUser(
                  item.order.discordUserId,
                  item.order.discordDisplayName,
                )}`
              : "-",
            item.status,
          ])}
        />
      )}
    </section>
  );
}

