import { FormEvent, useEffect, useState } from "react";

import { api } from "../api";
import { ReferralEventItem, ReferralSummaryResponse } from "../types";

export function ReferralsPage() {
  const [summary, setSummary] = useState<ReferralSummaryResponse | null>(null);
  const [events, setEvents] = useState<ReferralEventItem[]>([]);
  const [platform, setPlatform] = useState<"discord" | "telegram">("discord");
  const [userId, setUserId] = useState("");
  const [deltaPoints, setDeltaPoints] = useState("10");
  const [note, setNote] = useState("Admin adjust");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, eventsData] = await Promise.all([
        api.get<ReferralSummaryResponse>("/api/admin/referrals/summary"),
        api.get<ReferralEventItem[]>("/api/admin/referrals/events"),
      ]);
      setSummary(summaryData);
      setEvents(eventsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu referral");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onAdjust = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const next = await api.post<ReferralSummaryResponse>("/api/admin/referrals/points/adjust", {
        platform,
        userId,
        deltaPoints: Number(deltaPoints),
        note,
      });
      setSummary(next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể điều chỉnh điểm");
    }
  };

  if (loading) {
    return <section className="panel">Đang tải referral...</section>;
  }

  return (
    <section className="stack">
      <header className="panel">
        <h1>Referral</h1>
        {summary ? (
          <p>
            Tổng điểm hệ thống: <strong>{summary.totalPoints}</strong> | JOINED:{" "}
            <strong>{summary.statusCounts.JOINED ?? 0}</strong> | SUCCESS:{" "}
            <strong>{summary.statusCounts.SUCCESS ?? 0}</strong> | FAILED:{" "}
            <strong>{summary.statusCounts.FAILED ?? 0}</strong>
          </p>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
      </header>

      <section className="panel">
        <h2>Chỉnh điểm thủ công</h2>
        <form className="inline-form" onSubmit={onAdjust}>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as "discord" | "telegram")}>
            <option value="discord">Discord</option>
            <option value="telegram">Telegram</option>
          </select>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" required />
          <input
            value={deltaPoints}
            onChange={(e) => setDeltaPoints(e.target.value)}
            placeholder="Delta points"
            required
          />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
          <button className="button" type="submit">
            Lưu
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Leaderboard</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>User</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.leaderboard ?? []).map((item) => (
              <tr key={`${item.platform}-${item.userId}`}>
                <td>{item.platform}</td>
                <td>{item.userId}</td>
                <td>{item.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Events</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Inviter</th>
              <th>Invitee</th>
              <th>Status</th>
              <th>Points</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {events.map((item) => (
              <tr key={item.id}>
                <td>{item.platform}</td>
                <td>{item.inviterUserId}</td>
                <td>{item.inviteeUserId}</td>
                <td>{item.status}</td>
                <td>{item.pointsAwarded}</td>
                <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
