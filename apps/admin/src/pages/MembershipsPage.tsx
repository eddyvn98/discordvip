import { useEffect, useRef, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { MembershipItem } from "../types";
import { datetime, formatPlatformUser } from "../utils/format";

const MEMBERSHIP_DESC = "Quan tri thanh vien VIP: xem, tim kiem va thu hoi VIP.";
const SEARCH_PLACEHOLDER =
  "Tim theo ID, ten Discord, trang thai ACTIVE/EXPIRED, nguon PAID/TRIAL";
const MSG_REVOKED = "Da thu hoi VIP.";
const MSG_LOADING = "Dang tai...";
const MSG_SEARCH = "Tim kiem";
const MSG_ERROR = "Loi";
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
      // First pass: render quickly without waiting for Discord profile lookups.
      const fastData = await api.get<MembershipItem[]>(buildPath(false));
      if (requestRef.current !== requestId) {
        return;
      }
      setItems(fastData);
      setLoading(false);

      // Second pass: hydrate display names when available.
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
          <h1>Thanh vien VIP</h1>
          <p>{MEMBERSHIP_DESC}</p>
        </div>
        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value as "discord" | "telegram" | "all")}
        >
          <option value="discord">Discord</option>
          <option value="telegram">Telegram</option>
          <option value="all">Tat ca</option>
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
          Dat lai
        </button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? (
        <p>{`${MSG_ERROR}: ${error}`}</p>
      ) : (
        <Table
          headers={[
            "Nen tang",
            "Nguoi dung",
            "Nguon",
            "Trang thai",
            "Ngay dang ky",
            "Het han",
            "So lan thu go vai tro",
            "Loi gan nhat (neu co)",
            "Hanh dong",
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
            item.lastError ?? "Khong co",
            item.status === "ACTIVE" ? (
              <button className="button secondary" onClick={() => void revokeMembership(item.id)}>
                {"Thu hoi VIP"}
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
