import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import { api } from "./api";
import type {
  AdminUser,
  MembershipItem,
  OrderSearchItem,
  PendingItem,
  SummaryResponse,
  TransactionItem,
} from "./types";

function currency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function datetime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function useCurrentUser() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: AdminUser }>("/api/admin/me")
      .then((response) => setUser(response.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}

function LoginScreen() {
  return (
    <div className="login-shell">
      <div className="card login-card">
        <p className="eyebrow">Discord VIP</p>
        <h1>Admin panel</h1>
        <p>Đăng nhập bằng Discord account nằm trong allowlist hoặc có admin role.</p>
        <a className="button" href={api.loginUrl()}>
          Đăng nhập với Discord
        </a>
      </div>
    </div>
  );
}

function Layout({
  user,
  onLogout,
}: {
  user: AdminUser;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Discord VIP</p>
          <h2>Admin</h2>
        </div>
        <nav>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/memberships">Memberships</NavLink>
          <NavLink to="/pending">Pending</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} /> : <div className="avatar" />}
            <div>
              <strong>{user.username}</strong>
              <p>{user.id}</p>
            </div>
          </div>
          <button className="button secondary" onClick={() => void onLogout()}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/pending" element={<PendingPage />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardPage() {
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
    return <div className="card">Đang tải dashboard...</div>;
  }

  return (
    <div className="stack">
      <section className="card">
        <h1>Dashboard</h1>
        <div className="stats">
          <div className="stat-card">
            <span>Doanh thu</span>
            <strong>{currency(data.revenue)}</strong>
          </div>
          <div className="stat-card">
            <span>VIP đang active</span>
            <strong>{data.activeMemberships}</strong>
          </div>
          <div className="stat-card">
            <span>Pending review</span>
            <strong>{data.pendingCount}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Recent payments</h2>
            <p>Guild: {data.guildId}</p>
          </div>
        </div>
        <Table
          headers={["Thời gian", "TX", "Số tiền", "Status", "Order"]}
          rows={data.recentPayments.map((item) => [
            datetime(item.createdAt),
            item.providerTransactionId,
            currency(item.amount),
            item.status,
            item.order?.orderCode ?? "-",
          ])}
        />
      </section>
    </div>
  );
}

function TransactionsPage() {
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
          <h1>Transactions</h1>
          <p>Lịch sử thanh toán và trạng thái match order.</p>
        </div>
      </div>
      {error ? (
        <p>Lỗi: {error}</p>
      ) : (
        <Table
          headers={["Thời gian", "TX", "Số tiền", "Người gửi", "Nội dung", "Order", "Status"]}
          rows={items.map((item) => [
            datetime(item.createdAt),
            item.providerTransactionId,
            currency(item.amount),
            item.payerName ?? "-",
            item.transferContent ?? "-",
            item.order?.orderCode ?? "-",
            item.status,
          ])}
        />
      )}
    </section>
  );
}

function MembershipsPage() {
  const [items, setItems] = useState<MembershipItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<MembershipItem[]>("/api/admin/memberships")
      .then(setItems)
      .catch((value: Error) => setError(value.message));
  }, []);

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Memberships</h1>
          <p>Danh sách user VIP hiện tại và lịch sử lỗi gỡ role.</p>
        </div>
      </div>
      {error ? (
        <p>Lỗi: {error}</p>
      ) : (
        <Table
          headers={["Discord user", "Nguồn", "Status", "Hết hạn", "Retry", "Lỗi gần nhất"]}
          rows={items.map((item) => [
            item.discordUserId,
            item.source,
            item.status,
            datetime(item.expireAt),
            String(item.removeRetries),
            item.lastError ?? "-",
          ])}
        />
      )}
    </section>
  );
}

function PendingPage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, OrderSearchItem[]>>({});
  const [orderCodes, setOrderCodes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api
      .get<PendingItem[]>("/api/admin/pending")
      .then(setItems)
      .catch((value: Error) => setError(value.message));

  useEffect(() => {
    void load();
  }, []);

  const searchOrders = async (paymentId: string, query: string) => {
    setOrderCodes((current) => ({ ...current, [paymentId]: query }));
    if (!query.trim()) {
      return;
    }

    const result = await api.get<OrderSearchItem[]>(
      `/api/admin/orders/search?q=${encodeURIComponent(query)}`,
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
      setMessage("Đã resolve payment pending.");
      await load();
    } catch (value) {
      setError((value as Error).message);
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Pending review</h1>
          <p>Giao dịch chưa match tự động. Nhập order code để cấp VIP thủ công.</p>
        </div>
      </div>
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
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
              placeholder="Nhập order code"
              value={orderCodes[item.id] ?? ""}
              onChange={(event) => void searchOrders(item.id, event.target.value)}
            />
            <datalist id={`orders-${item.id}`}>
              {(suggestions[item.id] ?? []).map((order) => (
                <option
                  key={order.id}
                  value={order.orderCode}
                >{`${order.orderCode} - ${order.discordUserId} - ${order.plan.name}`}</option>
              ))}
            </datalist>
            <button className="button" onClick={() => void resolvePayment(item.id)}>
              Resolve
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((item) => (
              <th key={item}>{item}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const { user, loading, setUser } = useCurrentUser();

  if (loading) {
    return <div className="login-shell">Đang tải...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Layout
      user={user}
      onLogout={async () => {
        await api.logout();
        setUser(null);
      }}
    />
  );
}
