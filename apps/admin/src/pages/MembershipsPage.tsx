import { useEffect, useRef, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { DiscordLookupResult, MembershipItem } from "../types";
import { datetime, formatPlatformUser } from "../utils/format";

const MEMBERSHIP_DESC = "Quản trị thành viên VIP: xem, tìm kiếm, điều chỉnh hạn và thu hồi VIP.";
const SEARCH_PLACEHOLDER =
  "Tìm theo ID, tên Discord, trạng thái ACTIVE/EXPIRED, nguồn PAID/TRIAL/MANUAL";
const MSG_REVOKED = "Đã thu hồi VIP.";
const MSG_GRANTED = "Đã điều chỉnh hạn VIP.";
const MSG_LOADING = "Đang tải...";
const MSG_SEARCH = "Tìm kiếm";
const MSG_ERROR = "Lỗi";
const CACHE_PREFIX = "memberships-cache-v1";

type MembershipsMeta = {
  count: number;
  latestUpdatedAt: string | null;
};

type MembershipsCache = {
  platform: "discord" | "telegram" | "all";
  meta: MembershipsMeta;
  items: MembershipItem[];
};

function cacheKey(platform: "discord" | "telegram" | "all") {
  return `${CACHE_PREFIX}:${platform}`;
}

function readCache(platform: "discord" | "telegram" | "all"): MembershipsCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(platform));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as MembershipsCache;
  } catch {
    return null;
  }
}

function writeCache(
  platform: "discord" | "telegram" | "all",
  meta: MembershipsMeta,
  items: MembershipItem[],
) {
  try {
    const payload: MembershipsCache = { platform, meta, items };
    localStorage.setItem(cacheKey(platform), JSON.stringify(payload));
  } catch {
    // Ignore cache write failures.
  }
}

export function MembershipsPage() {
  const [items, setItems] = useState<MembershipItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<"discord" | "telegram" | "all">("discord");
  const [manualDiscordUserId, setManualDiscordUserId] = useState("");
  const [manualDurationDays, setManualDurationDays] = useState("30");
  const [lookupResult, setLookupResult] = useState<DiscordLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const requestRef = useRef(0);

  const load = async (query = "") => {
    setError("");
    setLoading(true);
    const requestId = ++requestRef.current;
    const buildPath = (includeNames: boolean) =>
      query.trim()
        ? `/api/admin/memberships/search?q=${encodeURIComponent(query.trim())}&platform=${platform}&names=${includeNames ? "1" : "0"}`
        : `/api/admin/memberships?platform=${platform}&names=${includeNames ? "1" : "0"}`;

    try {
      const fastData = await api.get<MembershipItem[]>(buildPath(false));
      if (requestRef.current !== requestId) {
        return;
      }
      setItems(fastData);
      setLoading(false);

      const namedData = await api.get<MembershipItem[]>(buildPath(true));
      if (requestRef.current !== requestId) {
        return;
      }
      setItems(namedData);
    } catch (value) {
      if (requestRef.current === requestId) {
        setError((value as Error).message);
      }
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const loadWithCache = async () => {
    setError("");
    setLoading(true);
    const requestId = ++requestRef.current;
    const cached = readCache(platform);

    try {
      if (cached) {
        setItems(cached.items);
      }

      const latestMeta = await api.get<MembershipsMeta>(`/api/admin/memberships/meta?platform=${platform}`);
      if (requestRef.current !== requestId) {
        return;
      }

      const cacheFresh =
        cached &&
        cached.meta.count === latestMeta.count &&
        cached.meta.latestUpdatedAt === latestMeta.latestUpdatedAt;

      if (cacheFresh) {
        setLoading(false);
        return;
      }

      const freshItems = await api.get<MembershipItem[]>(
        `/api/admin/memberships?platform=${platform}&names=0`,
      );
      if (requestRef.current !== requestId) {
        return;
      }
      setItems(freshItems);
      writeCache(platform, latestMeta, freshItems);
      setLoading(false);

      const hydrated = await api.get<MembershipItem[]>(
        `/api/admin/memberships?platform=${platform}&names=1`,
      );
      if (requestRef.current !== requestId) {
        return;
      }
      setItems(hydrated);
      writeCache(platform, latestMeta, hydrated);
    } catch (value) {
      if (requestRef.current === requestId) {
        setError((value as Error).message);
      }
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (search.trim()) {
      const timeout = window.setTimeout(() => {
        void load(search);
      }, 250);
      return () => window.clearTimeout(timeout);
    }

    void loadWithCache();
    return undefined;
  }, [search, platform]);

  const lookupDiscordUser = async () => {
    setError("");
    setMessage("");
    setLookupResult(null);
    setLookupLoading(true);

    try {
      const result = await api.post<DiscordLookupResult>("/api/admin/memberships/lookup-discord-user", {
        discordUserId: manualDiscordUserId.trim(),
      });
      setLookupResult(result);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setLookupLoading(false);
    }
  };

  const grantManualMembership = async () => {
    setError("");
    setMessage("");
    setGrantLoading(true);

    try {
      await api.post("/api/admin/memberships/manual-grant", {
        discordUserId: manualDiscordUserId.trim(),
        durationDays: Number(manualDurationDays),
      });
      setMessage(MSG_GRANTED);
      await lookupDiscordUser();
      await load(search);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setGrantLoading(false);
    }
  };

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
        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value as "discord" | "telegram" | "all")}
        >
          <option value="discord">Discord</option>
          <option value="telegram">Telegram</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      <div className="manual-grant-panel">
        <div>
          <h2>Điều chỉnh hạn VIP</h2>
          <p>Nhập Discord user ID, kiểm tra user trong guild, sau đó cộng hoặc trừ số ngày VIP.</p>
        </div>
        <div className="manual-grant-form">
          <input
            value={manualDiscordUserId}
            onChange={(event) => {
              setManualDiscordUserId(event.target.value);
              setLookupResult(null);
            }}
            placeholder="Discord user ID"
          />
          <input
            value={manualDurationDays}
            onChange={(event) => setManualDurationDays(event.target.value)}
            placeholder="Số ngày VIP, âm để trừ"
            inputMode="numeric"
          />
          <button
            className="button secondary"
            type="button"
            onClick={() => void lookupDiscordUser()}
            disabled={lookupLoading || !manualDiscordUserId.trim()}
          >
            {lookupLoading ? MSG_LOADING : "Kiểm tra user"}
          </button>
          <button
            className="button"
            type="button"
            onClick={() => void grantManualMembership()}
            disabled={grantLoading || !manualDiscordUserId.trim() || !manualDurationDays.trim()}
          >
            {grantLoading ? MSG_LOADING : "Điều chỉnh"}
          </button>
        </div>
        {lookupResult ? (
          <p className="manual-grant-result">
            User hợp lệ: <strong>{lookupResult.displayName}</strong> ({lookupResult.id})
          </p>
        ) : null}
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
            "Nền tảng",
            "Người dùng",
            "Nguồn",
            "Trạng thái",
            "Ngày đăng ký",
            "Hết hạn",
            "Số lần thử gỡ vai trò",
            "Lỗi gần nhất (nếu có)",
            "Hành động",
          ]}
          rows={items.map((item) => [
            item.platform,
            formatPlatformUser({
              platform: item.platform,
              platformUserId: item.platformUserId,
              discordDisplayName: item.discordDisplayName,
            }),
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
