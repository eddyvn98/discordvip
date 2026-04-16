import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../../api";
import { CinemaChannel, CinemaScanJob } from "../cinema.types";
import { getDefaultSelectedChannelId } from "../cinema.helpers";

interface UseCinemaPageDataProps {
  setError: (err: string) => void;
}

export function useCinemaPageData({ setError }: UseCinemaPageDataProps) {
  const [channels, setChannels] = useState<CinemaChannel[]>([]);
  const [jobs, setJobs] = useState<CinemaScanJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [channelRows, jobRows] = await Promise.all([
        api.get<CinemaChannel[]>("/api/admin/cinema/channels"),
        api.get<CinemaScanJob[]>("/api/admin/cinema/jobs?limit=50"),
      ]);
      setChannels(channelRows);
      setJobs(jobRows);
      
      // Sử dụng selectedChannelId từ state hiện tại để tránh override nếu đã chọn
      setSelectedChannelId((currentId) => {
        if (currentId) return currentId;
        return getDefaultSelectedChannelId(channelRows);
      });
    } catch (err) {
      setError("Không thể tải dữ liệu.");
    }
  }, [setError]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

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
    loading,
    selectedChannelId,
    setSelectedChannelId,
    selectedChannel,
    reload: load,
  };
}
