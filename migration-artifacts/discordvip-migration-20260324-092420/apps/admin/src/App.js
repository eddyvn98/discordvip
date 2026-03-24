import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";
function currency(amount) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(amount);
}
function datetime(value) {
    return new Date(value).toLocaleString("vi-VN");
}
function formatDiscordUser(discordUserId, discordDisplayName) {
    return discordDisplayName ? `${discordDisplayName} (${discordUserId})` : discordUserId;
}
function useCurrentUser() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api
            .get("/api/admin/me")
            .then((response) => setUser(response.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);
    return { user, loading, setUser };
}
function LoginScreen() {
    return (_jsx("div", { className: "login-shell", children: _jsxs("div", { className: "card login-card", children: [_jsx("p", { className: "eyebrow", children: "Discord VIP" }), _jsx("h1", { children: "Admin panel" }), _jsx("p", { children: "\u0110\u0103ng nh\u1EADp b\u1EB1ng Discord account n\u1EB1m trong allowlist ho\u1EB7c c\u00F3 admin role." }), _jsx("a", { className: "button", href: api.loginUrl(), children: "\u0110\u0103ng nh\u1EADp v\u1EDBi Discord" })] }) }));
}
function Layout({ user, onLogout, }) {
    return (_jsxs("div", { className: "layout", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Discord VIP" }), _jsx("h2", { children: "Admin" })] }), _jsxs("nav", { children: [_jsx(NavLink, { to: "/", children: "Dashboard" }), _jsx(NavLink, { to: "/transactions", children: "Transactions" }), _jsx(NavLink, { to: "/memberships", children: "Memberships" }), _jsx(NavLink, { to: "/pending", children: "Pending" })] }), _jsxs("div", { className: "sidebar-footer", children: [_jsxs("div", { className: "user-card", children: [user.avatarUrl ? _jsx("img", { src: user.avatarUrl, alt: user.username }) : _jsx("div", { className: "avatar" }), _jsxs("div", { children: [_jsx("strong", { children: user.username }), _jsx("p", { children: user.id })] })] }), _jsx("button", { className: "button secondary", onClick: () => void onLogout(), children: "\u0110\u0103ng xu\u1EA5t" })] })] }), _jsx("main", { className: "content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/transactions", element: _jsx(TransactionsPage, {}) }), _jsx(Route, { path: "/memberships", element: _jsx(MembershipsPage, {}) }), _jsx(Route, { path: "/pending", element: _jsx(PendingPage, {}) })] }) })] }));
}
function DashboardPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        api
            .get("/api/admin/summary")
            .then(setData)
            .catch((value) => setError(value.message));
    }, []);
    if (error) {
        return _jsxs("div", { className: "card", children: ["L\u1ED7i: ", error] });
    }
    if (!data) {
        return _jsx("div", { className: "card", children: "\u0110ang t\u1EA3i dashboard..." });
    }
    return (_jsxs("div", { className: "stack", children: [_jsxs("section", { className: "card", children: [_jsx("h1", { children: "Dashboard" }), _jsxs("div", { className: "stats", children: [_jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Doanh thu" }), _jsx("strong", { children: currency(data.revenue) })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "VIP \u0111ang active" }), _jsx("strong", { children: data.activeMemberships })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Pending review" }), _jsx("strong", { children: data.pendingCount })] })] })] }), _jsxs("section", { className: "card", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("h2", { children: "Recent payments" }), _jsxs("p", { children: ["Guild: ", data.guildId] })] }) }), _jsx(Table, { headers: ["Thời gian", "TX", "Số tiền", "Status", "Order"], rows: data.recentPayments.map((item) => [
                            datetime(item.createdAt),
                            item.providerTransactionId,
                            currency(item.amount),
                            item.status,
                            item.order
                                ? `${item.order.orderCode} - ${formatDiscordUser(item.order.discordUserId, item.order.discordDisplayName)}`
                                : "-",
                        ]) })] })] }));
}
function TransactionsPage() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => {
        api
            .get("/api/admin/transactions")
            .then(setItems)
            .catch((value) => setError(value.message));
    }, []);
    return (_jsxs("section", { className: "card", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("h1", { children: "Transactions" }), _jsx("p", { children: "L\u1ECBch s\u1EED thanh to\u00E1n v\u00E0 tr\u1EA1ng th\u00E1i match order." })] }) }), error ? (_jsxs("p", { children: ["L\u1ED7i: ", error] })) : (_jsx(Table, { headers: ["Thời gian", "TX", "Số tiền", "Người gửi", "Nội dung", "Order", "Status"], rows: items.map((item) => [
                    datetime(item.createdAt),
                    item.providerTransactionId,
                    currency(item.amount),
                    item.payerName ?? "-",
                    item.transferContent ?? "-",
                    item.order
                                ? `${item.order.orderCode} - ${formatDiscordUser(item.order.discordUserId, item.order.discordDisplayName)}`
                                : "-",
                    item.status,
                ]) }))] }));
}
function MembershipsPage() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const load = (query = "") => {
        const path = query.trim()
            ? `/api/admin/memberships/search?q=${encodeURIComponent(query.trim())}`
            : "/api/admin/memberships";
        return api
            .get(path)
            .then(setItems)
            .catch((value) => setError(value.message));
    };
    useEffect(() => {
        void load();
    }, []);
    const revokeMembership = async (membershipId) => {
        setError("");
        setMessage("");
        try {
            await api.post(`/api/admin/memberships/${membershipId}/revoke`);
            setMessage("Đã thu hồi VIP thành công.");
            await load(search);
        }
        catch (value) {
            setError(value.message);
        }
    };
    return (_jsxs("section", { className: "card", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("h1", { children: "Memberships" }), _jsx("p", { children: "Danh s\u00E1ch user VIP hi\u1EC7n t\u1EA1i v\u00E0 l\u1ECBch s\u1EED l\u1ED7i g\u1EE1 role." })] }) }), error ? (_jsxs("p", { children: ["L\u1ED7i: ", error] })) : (_jsx(Table, { headers: ["Discord user", "Nguồn", "Status", "Ngày đăng ký", "Hết hạn", "Số lần thử gỡ role", "Lỗi gần nhất (nếu có)"], rows: items.map((item) => [
                    formatDiscordUser(item.discordUserId, item.discordDisplayName),
                    item.source,
                    item.status,
                    datetime(item.createdAt),
                    datetime(item.expireAt),
                    String(item.removeRetries),
                    item.lastError ?? "Không có",
                    item.status === "ACTIVE"
                        ? _jsx("button", { className: "button secondary", onClick: () => void revokeMembership(item.id), children: "Thu hồi VIP" })
                        : "-",
                ]) }), _jsx("div", { style: { marginBottom: "16px" }, children: _jsxs("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" }, children: [_jsx("input", { value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Tìm theo ID, tên, trạng thái ACTIVE/EXPIRED, nguồn PAID/TRIAL", style: { minWidth: "320px", flex: 1, padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(148,163,184,.2)", background: "#0f172a", color: "#fff" } }), _jsx("button", { className: "button", onClick: () => void load(search), children: "Tìm kiếm" }), _jsx("button", { className: "button secondary", onClick: () => {
                                        setSearch("");
                                        void load("");
                                    }, children: "Reset" })] }) }), message ? _jsx("p", { className: "success", children: message }) : null, error ? _jsx("p", { className: "error", children: error }) : null] }));
}
function PendingPage() {
    const [items, setItems] = useState([]);
    const [suggestions, setSuggestions] = useState({});
    const [orderCodes, setOrderCodes] = useState({});
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const load = () => api
        .get("/api/admin/pending")
        .then(setItems)
        .catch((value) => setError(value.message));
    useEffect(() => {
        void load();
    }, []);
    const searchOrders = async (paymentId, query) => {
        setOrderCodes((current) => ({ ...current, [paymentId]: query }));
        if (!query.trim()) {
            return;
        }
        const result = await api.get(`/api/admin/orders/search?q=${encodeURIComponent(query)}`);
        setSuggestions((current) => ({ ...current, [paymentId]: result }));
    };
    const resolvePayment = async (paymentId) => {
        setError("");
        setMessage("");
        try {
            await api.post(`/api/admin/pending/${paymentId}/resolve`, {
                orderCode: orderCodes[paymentId],
            });
            setMessage("Đã xử lý payment pending.");
            await load();
        }
        catch (value) {
            setError(value.message);
        }
    };
    return (_jsxs("section", { className: "card", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("h1", { children: "Pending review" }), _jsx("p", { children: "Giao d\u1ECBch ch\u01B0a match t\u1EF1 \u0111\u1ED9ng. Nh\u1EADp order code \u0111\u1EC3 c\u1EA5p VIP th\u1EE7 c\u00F4ng." })] }) }), message ? _jsx("p", { className: "success", children: message }) : null, error ? _jsx("p", { className: "error", children: error }) : null, _jsx("div", { className: "pending-list", children: items.map((item) => (_jsxs("div", { className: "pending-card", children: [_jsxs("div", { className: "pending-meta", children: [_jsx("strong", { children: currency(item.amount) }), _jsx("span", { children: item.providerTransactionId }), _jsx("span", { children: datetime(item.createdAt) }), _jsx("span", { children: item.payerName ?? "Không rõ người gửi" })] }), _jsx("p", { children: item.transferContent ?? "Không có nội dung chuyển khoản" }), _jsx("input", { list: `orders-${item.id}`, placeholder: "Nh\u1EADp order code", value: orderCodes[item.id] ?? "", onChange: (event) => void searchOrders(item.id, event.target.value) }), _jsx("datalist", { id: `orders-${item.id}`, children: (suggestions[item.id] ?? []).map((order) => (_jsx("option", { value: order.orderCode, children: `${order.orderCode} - ${formatDiscordUser(order.discordUserId, order.discordDisplayName)} - ${order.plan.name}` }, order.id))) }), _jsx("button", { className: "button", onClick: () => void resolvePayment(item.id), children: "Resolve" })] }, item.id))) })] }));
}
function Table({ headers, rows, }) {
    return (_jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: headers.map((item) => (_jsx("th", { children: item }, item))) }) }), _jsx("tbody", { children: rows.map((row, index) => (_jsx("tr", { children: row.map((cell, cellIndex) => (_jsx("td", { children: cell }, `${cell}-${cellIndex}`))) }, `${row[0]}-${index}`))) })] }) }));
}
export default function App() {
    const { user, loading, setUser } = useCurrentUser();
    if (loading) {
        return _jsx("div", { className: "login-shell", children: "\u0110ang t\u1EA3i..." });
    }
    if (!user) {
        return _jsx(LoginScreen, {});
    }
    return (_jsx(Layout, { user: user, onLogout: async () => {
            await api.logout();
            setUser(null);
        } }));
}

