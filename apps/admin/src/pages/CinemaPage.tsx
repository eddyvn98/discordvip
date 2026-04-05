import { useEffect, useMemo, useState } from "react";

import { api } from "../api";
import { datetime } from "../utils/format";

type CinemaChannel = {
  id: string;
  displayName: string;
  role: "FULL_SOURCE" | "PREVIEW_STORAGE" | "POSTER_STORAGE";
  platform: "TELEGRAM" | "DISCORD";
  sourceChannelId: string;
  isEnabled: boolean;
};

type CinemaScanJob = {
  id: string;
  channelId: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  totalDetected: number;
  totalInserted: number;
  totalFailed: number;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
  failureReason?: string | null;
};

export function CinemaPage() {
  const [channels, setChannels] = useState<CinemaChannel[]>([]);
  const [jobs, setJobs] = useState<CinemaScanJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [runningByChannel, setRunningByChannel] = useState<Record<string, boolean>>({});

  const load = async () => {
    const [channelRows, jobRows] = await Promise.all([
      api.get<CinemaChannel[]>("/api/admin/cinema/channels"),
      api.get<CinemaScanJob[]>("/api/admin/cinema/jobs?limit=100"),
    ]);
    setChannels(channelRows);
    setJobs(jobRows);
  };

  useEffect(() => {
    setLoading(true);
    void load()
      .catch((value) => setError((value as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void api
        .get<CinemaScanJob[]>("/api/admin/cinema/jobs?limit=100")
        .then(setJobs)
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const fullSourceChannels = useMemo(
    () => channels.filter((channel) => channel.isEnabled && channel.role === "FULL_SOURCE"),
    [channels],
  );

  const latestJobByChannel = useMemo(() => {
    const map = new Map<string, CinemaScanJob>();
    for (const job of jobs) {
      if (!map.has(job.channelId)) map.set(job.channelId, job);
    }
    return map;
  }, [jobs]);

  const ensureStorageAndScan = async (channelId: string) => {
    setRunningByChannel((current) => ({ ...current, [channelId]: true }));
    setError("");
    setMessage("");
    try {
      await api.post<{ ok: boolean }>("/api/admin/cinema/storage/ensure", {});
      await api.post("/api/admin/cinema/jobs/scan", {
        channelId,
        forceRegenerate: true,
        autoEnsureStorage: true,
      });
      await load();
      setMessage("Đã bắt đầu quét toàn bộ và tạo lại preview/thumbnail.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setRunningByChannel((current) => ({ ...current, [channelId]: false }));
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Cinema</h1>
          <p>Quét toàn bộ phim, tạo lại preview/thumbnail và theo dõi tiến độ realtime.</p>
        </div>
      </div>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Đang tải...</p> : null}

      {fullSourceChannels.map((channel) => {
        const job = latestJobByChannel.get(channel.id);
        const total = Math.max(0, (job?.totalDetected ?? 0) || 0);
        const done = Math.max(0, (job?.totalInserted ?? 0) + (job?.totalFailed ?? 0));
        const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        return (
          <div key={channel.id} className="manual-grant-panel" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ marginBottom: 6 }}>{channel.displayName}</h2>
              <p style={{ marginBottom: 6 }}>
                {channel.platform} / {channel.sourceChannelId}
              </p>
              {job ? (
                <p style={{ marginBottom: 8 }}>
                  Job: {job.status} | {done}/{total} | Cập nhật: {datetime(job.updatedAt)}
                </p>
              ) : (
                <p style={{ marginBottom: 8 }}>Chưa có job.</p>
              )}
              <div style={{ height: 8, background: "#1f2937", borderRadius: 999, overflow: "hidden", maxWidth: 460 }}>
                <div style={{ width: `${percent}%`, height: "100%", background: "#22c55e" }} />
              </div>
              {job?.failureReason ? <p className="error">Lỗi: {job.failureReason}</p> : null}
            </div>
            <div>
              <button
                className="button"
                type="button"
                onClick={() => void ensureStorageAndScan(channel.id)}
                disabled={Boolean(runningByChannel[channel.id])}
              >
                {runningByChannel[channel.id] ? "Đang bắt đầu..." : "Quét toàn bộ + tạo lại preview/thumbnail"}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

