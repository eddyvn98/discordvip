import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../../api";
import { CinemaAccessMeResponse, CinemaChannel, CinemaChannelDetail, CinemaScanJob, CinemaStats, CinemaWebMovie } from "../cinema.types";
import { getDefaultSelectedChannelId } from "../cinema.helpers";

interface UseCinemaPageDataProps {
  setError: (err: string) => void;
  forceSelectedChannelId?: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function toAbsoluteMediaUrl(url?: string | null) {
  const value = String(url ?? "").trim();
  if (!value) return null;
  if (/^(?:https?:)?\/\//u.test(value) || value.startsWith("data:")) return value;
  if (!API_BASE_URL) return value;
  const base = API_BASE_URL.replace(/\/+$/u, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${base}${path}`;
}

function normalizeChannelPoster(channel: CinemaChannel): CinemaChannel {
  return {
    ...channel,
    posterUrl: toAbsoluteMediaUrl(channel.posterUrl),
  };
}

function normalizeChannelDetail(detail: CinemaChannelDetail): CinemaChannelDetail {
  return {
    ...detail,
    movies: detail.movies.map((movie) => ({
      ...movie,
      posterUrl: toAbsoluteMediaUrl(movie.posterUrl),
    })),
  };
}

export function useCinemaPageData({ setError, forceSelectedChannelId }: UseCinemaPageDataProps) {
  const [channels, setChannels] = useState<CinemaChannel[]>([]);
  const [jobs, setJobs] = useState<CinemaScanJob[]>([]);
  const [stats, setStats] = useState<CinemaStats | null>(null);
  const [webMovies, setWebMovies] = useState<CinemaWebMovie[]>([]);
  const [selectedChannelDetail, setSelectedChannelDetail] = useState<CinemaChannelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingChannelDetail, setLoadingChannelDetail] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [accessMe, setAccessMe] = useState<CinemaAccessMeResponse | null>(null);

  const loadSelectedChannelDetail = useCallback(async (channelId: string | null) => {
    if (!channelId) {
      setSelectedChannelDetail(null);
      return;
    }

    setLoadingChannelDetail(true);
    try {
      const detail = await api.get<CinemaChannelDetail>(`/api/admin/cinema/channels/${channelId}`);
      setSelectedChannelDetail(normalizeChannelDetail(detail));
    } catch {
      setSelectedChannelDetail(null);
    } finally {
      setLoadingChannelDetail(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [channelRows, jobRows, statsData, webMovieRows, access] = await Promise.all([
        api.get<CinemaChannel[]>("/api/admin/cinema/channels"),
        api.get<CinemaScanJob[]>("/api/admin/cinema/jobs?limit=50"),
        api.get<CinemaStats>("/api/admin/cinema/stats"),
        api.get<CinemaWebMovie[]>("/api/admin/cinema/movies/web"),
        api.get<CinemaAccessMeResponse>("/api/admin/cinema/access/me"),
      ]);
      const normalizedChannels = channelRows.map(normalizeChannelPoster);
      setChannels(normalizedChannels);
      setJobs(jobRows);
      setStats(statsData);
      setWebMovies(webMovieRows);
      setAccessMe(access);

      // Nếu có forceSelectedChannelId, dùng nó; ngược lại auto-select
      if (forceSelectedChannelId !== undefined) {
        setSelectedChannelId(forceSelectedChannelId);
      } else {
        setSelectedChannelId((currentId) => {
          if (currentId && normalizedChannels.some((row) => row.id === currentId)) {
            return currentId;
          }
          return getDefaultSelectedChannelId(normalizedChannels);
        });
      }
    } catch {
      setError("Khong the tai du lieu.");
    }
  }, [setError]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  // Sync selectedChannelId state với forceSelectedChannelId prop
  useEffect(() => {
    if (forceSelectedChannelId !== undefined) {
      setSelectedChannelId(forceSelectedChannelId);
    }
  }, [forceSelectedChannelId]);

  useEffect(() => {
    void loadSelectedChannelDetail(selectedChannelId);
  }, [selectedChannelId, loadSelectedChannelDetail]);

  useEffect(() => {
    const timer = setInterval(() => {
      void api
        .get<CinemaScanJob[]>("/api/admin/cinema/jobs?limit=50")
        .then(setJobs)
        .catch(() => undefined);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) || null,
    [channels, selectedChannelId]
  );

  return {
    channels,
    jobs,
    webMovies,
    loading,
    loadingChannelDetail,
    selectedChannelId,
    setSelectedChannelId,
    selectedChannel,
    selectedChannelDetail,
    stats,
    accessMe,
    reload: load,
    reloadSelectedChannelDetail: loadSelectedChannelDetail,
  };
}
