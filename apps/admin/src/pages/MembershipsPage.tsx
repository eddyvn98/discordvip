import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { MembershipItem } from "../types";
import { datetime, formatDiscordUser } from "../utils/format";

const MEMBERSHIP_DESC = "Quản trị thành viên VIP: xem, tìm kiếm và thu hồi VIP.";
const SEARCH_PLACEHOLDER =
  "Tìm theo ID, tên Discord, trạng thái ACTIVE/EXPIRED, nguồn PAID/TRIAL";
const MSG_REVOKED = "Đã thu hồi VIP.";
const MSG_LOADING = "Đang tải...";
const MSG_SEARCH = "Tìm kiếm";
const MSG_ERROR = "Lỗi";

export function MembershipsPage() {
  const [items, setItems] = useState<MembershipItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (query = "") => {
    setError("");
    setLoading(true);
    const path = query.trim()
      ? `/api/admin/memberships/search?q=${encodeURIComponent(query.trim())}`
      : "/api/admin/memberships";

    try {
      const data = await api.get<MembershipItem[]>(path);
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
  }, [search]);

  const revokeMembership = async (membershipId: string) => {
    setError("");
    setMessage("");

    try {
      await api.post(`/api/admin/memberships/${membershipId}/revoke`);
      setMessage(MSG_REVOKED);
      await load(search);
    } catch (value) {
      setError((value as Error).message);
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Thành viên VIP</h1>
          <p>{MEMBERSHIP_DESC}</p>
        </div>
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
          placeholder={SEARCH_PLACEHOLDER}
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
          Đặt lại
        </button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? (
        <p>{`${MSG_ERROR}: ${error}`}</p>
      ) : (
        <Table
          headers={[
            "Người dùng Discord",
            "Nguồn",
            "Trạng thái",
            "Ngày đăng ký",
            "Hết hạn",
            "Số lần thử gỡ vai trò",
            "Lỗi gần nhất (nếu có)",
            "Hành động",
          ]}
          rows={items.map((item) => [
            formatDiscordUser(item.discordUserId, item.discordDisplayName),
            item.source,
            item.status,
            datetime(item.createdAt),
            datetime(item.expireAt),
            String(item.removeRetries),
            item.lastError ?? "Không có",
            item.status === "ACTIVE" ? (
              <button className="button secondary" onClick={() => void revokeMembership(item.id)}>
                {"Thu hồi VIP"}
              </button>
            ) : (
              "-"
            ),
          ])}
        />
      )}
    </section>
  );
}

