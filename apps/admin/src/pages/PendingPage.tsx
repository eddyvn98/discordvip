import { useEffect, useState } from "react";

import { api } from "../api";
import type { OrderSearchItem, PendingItem, PendingOrderItem } from "../types";
import { currency, datetime, formatPlatformUser } from "../utils/format";

export function PendingPage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [orders, setOrders] = useState<PendingOrderItem[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, OrderSearchItem[]>>({});
  const [orderCodes, setOrderCodes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState<"discord" | "telegram" | "all">("discord");

  const load = async () => {
    setError("");

    try {
      const [pendingPayments, pendingOrders] = await Promise.all([
        api.get<PendingItem[]>("/api/admin/pending"),
        api.get<PendingOrderItem[]>(`/api/admin/orders/pending?platform=${platform}`),
      ]);
      setItems(pendingPayments);
      setOrders(pendingOrders);
    } catch (value) {
      setError((value as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, [platform]);

  const searchOrders = async (paymentId: string, query: string) => {
    setOrderCodes((current) => ({ ...current, [paymentId]: query }));
    if (!query.trim()) {
      return;
    }

    const result = await api.get<OrderSearchItem[]>(
      `/api/admin/orders/search?q=${encodeURIComponent(query)}&platform=${platform}`,
    );
    setSuggestions((current) => ({ ...current, [paymentId]: result }));
  };

  const resolvePayment = async (paymentId: string) => {
    setError("");
    setMessage("");

    try {
      await api.post(`/api/admin/pending/${paymentId}/resolve`, {
        orderCode: orderCodes[paymentId],
      });
      setMessage("Ðã x? lý giao d?ch ch? duy?t.");
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
      setMessage("Ðã xóa giao d?ch ch? duy?t.");
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
      setMessage("Ðã xác nh?n don th? công và c?p VIP.");
      await load();
    } catch (value) {
      setError((value as Error).message);
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Ch? duy?t</h1>
          <p>Qu?n lý giao d?ch ch? duy?t và xác nh?n don th? công khi chua dùng SePay.</p>
        </div>
        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value as "discord" | "telegram" | "all")}
        >
          <option value="discord">Discord</option>
          <option value="telegram">Telegram</option>
          <option value="all">T?t c?</option>
        </select>
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
                <span>
                  {formatPlatformUser({
                    platform: item.platform,
                    platformUserId: item.platformUserId,
                    discordDisplayName: item.discordDisplayName,
                  })}
                </span>
              </div>
              <p>{item.plan.name}</p>
              <p>H?t h?n: {datetime(item.expiresAt)}</p>
              <button className="button" onClick={() => void confirmOrder(item.id)}>
                Xác nh?n th? công
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
                <span>{item.payerName ?? "Không rõ ngu?i g?i"}</span>
              </div>
              <p>{item.transferContent ?? "Không có n?i dung chuy?n kho?n"}</p>
              <input
                list={`orders-${item.id}`}
                placeholder="Nh?p mã don"
                value={orderCodes[item.id] ?? ""}
                onChange={(event) => void searchOrders(item.id, event.target.value)}
              />
              <datalist id={`orders-${item.id}`}>
                {(suggestions[item.id] ?? []).map((order) => (
                  <option
                    key={order.id}
                    value={order.orderCode}
                  >{`${order.orderCode} - ${formatPlatformUser({
                    platform: order.platform,
                    platformUserId: order.platformUserId,
                    discordDisplayName: order.discordDisplayName,
                  })} - ${order.plan.name}`}</option>
                ))}
              </datalist>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="button" onClick={() => void resolvePayment(item.id)}>
                  X? lý
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
