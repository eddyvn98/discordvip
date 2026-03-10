import { useEffect, useState } from "react";

import { api } from "../api";
import type { OrderSearchItem, PendingItem, PendingOrderItem } from "../types";
import { currency, datetime, formatDiscordUser } from "../utils/format";

export function PendingPage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [orders, setOrders] = useState<PendingOrderItem[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, OrderSearchItem[]>>({});
  const [orderCodes, setOrderCodes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");

    try {
      const [pendingPayments, pendingOrders] = await Promise.all([
        api.get<PendingItem[]>("/api/admin/pending"),
        api.get<PendingOrderItem[]>("/api/admin/orders/pending"),
      ]);
      setItems(pendingPayments);
      setOrders(pendingOrders);
    } catch (value) {
      setError((value as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const searchOrders = async (paymentId: string, query: string) => {
    setOrderCodes((current) => ({ ...current, [paymentId]: query }));
    if (!query.trim()) {
      return;
    }

    const result = await api.get<OrderSearchItem[]>(`/api/admin/orders/search?q=${encodeURIComponent(query)}`);
    setSuggestions((current) => ({ ...current, [paymentId]: result }));
  };

  const resolvePayment = async (paymentId: string) => {
    setError("");
    setMessage("");

    try {
      await api.post(`/api/admin/pending/${paymentId}/resolve`, {
        orderCode: orderCodes[paymentId],
      });
      setMessage("Đã xử lý giao dịch chờ duyệt.");
      await load();
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const deletePendingPayment = async (paymentId: string) => {
    setError("");
    setMessage("");

    try {
      await api.post(`/api/admin/pending/${paymentId}/delete`);
      setMessage("Đã xóa giao dịch chờ duyệt.");
      await load();
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const confirmOrder = async (orderId: string) => {
    setError("");
    setMessage("");

    try {
      await api.post(`/api/admin/orders/${orderId}/confirm`);
      setMessage("Đã xác nhận đơn thủ công và cấp VIP.");
      await load();
    } catch (value) {
      setError((value as Error).message);
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Chờ duyệt</h1>
          <p>Quản lý giao dịch chờ duyệt và xác nhận đơn thủ công khi chưa dùng SePay.</p>
        </div>
      </div>
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="scroll-panel">
        <div className="pending-list">
          {orders.map((item) => (
            <div className="pending-card" key={item.id}>
              <div className="pending-meta">
                <strong>{currency(item.amount)}</strong>
                <span>{item.orderCode}</span>
                <span>{datetime(item.createdAt)}</span>
                <span>{formatDiscordUser(item.discordUserId, item.discordDisplayName)}</span>
              </div>
              <p>{item.plan.name}</p>
              <p>Hết hạn: {datetime(item.expiresAt)}</p>
              <button className="button" onClick={() => void confirmOrder(item.id)}>
                Xác nhận thủ công
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-panel">
        <div className="pending-list">
          {items.map((item) => (
            <div className="pending-card" key={item.id}>
              <div className="pending-meta">
                <strong>{currency(item.amount)}</strong>
                <span>{item.providerTransactionId}</span>
                <span>{datetime(item.createdAt)}</span>
                <span>{item.payerName ?? "Không rõ người gửi"}</span>
              </div>
              <p>{item.transferContent ?? "Không có nội dung chuyển khoản"}</p>
              <input
                list={`orders-${item.id}`}
                placeholder="Nhập mã đơn"
                value={orderCodes[item.id] ?? ""}
                onChange={(event) => void searchOrders(item.id, event.target.value)}
              />
              <datalist id={`orders-${item.id}`}>
                {(suggestions[item.id] ?? []).map((order) => (
                  <option
                    key={order.id}
                    value={order.orderCode}
                  >{`${order.orderCode} - ${formatDiscordUser(
                    order.discordUserId,
                    order.discordDisplayName,
                  )} - ${order.plan.name}`}</option>
                ))}
              </datalist>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="button" onClick={() => void resolvePayment(item.id)}>
                  Xử lý
                </button>
                <button
                  className="button secondary"
                  onClick={() => void deletePendingPayment(item.id)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

