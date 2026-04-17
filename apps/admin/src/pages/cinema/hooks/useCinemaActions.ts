import { useState } from "react";
import { api } from "../../../api";

interface UseCinemaActionsProps {
  reload: () => Promise<void>;
  reloadSelectedChannelDetail: (channelId: string | null) => Promise<void>;
  selectedChannelId: string | null;
  setMessage: (msg: string) => void;
  setError: (err: string) => void;
}

export function useCinemaActions({
  reload,
  reloadSelectedChannelDetail,
  selectedChannelId,
  setMessage,
  setError,
}: UseCinemaActionsProps) {
  const [runningByChannel, setRunningByChannel] = useState<Record<string, boolean>>({});
  const [localUploading, setLocalUploading] = useState(false);
  const [cancellingJobs, setCancellingJobs] = useState<Record<string, boolean>>({});
  const [renamingChannels, setRenamingChannels] = useState<Record<string, boolean>>({});
  const [deletingChannels, setDeletingChannels] = useState<Record<string, boolean>>({});
  const [renamingMovies, setRenamingMovies] = useState<Record<string, boolean>>({});
  const [deletingMovies, setDeletingMovies] = useState<Record<string, boolean>>({});

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
      await reload();
      setMessage("Da bat dau quet toan bo va tao lai preview/thumbnail.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setRunningByChannel((current) => ({ ...current, [channelId]: false }));
    }
  };

  const startLocalUpload = async (localPath: string) => {
    if (!localPath.trim()) {
      setError("Vui long nhap duong dan thu muc.");
      return;
    }
    setLocalUploading(true);
    setError("");
    setMessage("");
    try {
      await api.post("/api/admin/cinema/upload-local", {
        directoryPath: localPath.trim(),
      });
      setMessage("Da bat dau qua trinh upload va dong bo tu thu muc local.");
      await reload();
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setLocalUploading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    setCancellingJobs((curr) => ({ ...curr, [jobId]: true }));
    try {
      await api.post(`/api/admin/cinema/jobs/${jobId}/cancel`, {});
      setMessage("Da gui yeu cau dung cong viec.");
      await reload();
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setCancellingJobs((curr) => ({ ...curr, [jobId]: false }));
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      setError("");
      await api.post(`/api/admin/cinema/jobs/${jobId}/retry`, {});
      setMessage("Da bat dau chay lai cong viec.");
      await reload();
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const syncChannel = async (channelId: string) => {
    try {
      setError("");
      await api.get(`/api/admin/cinema/channels/${channelId}/sync`);
      setMessage("Da cap nhat trang thai tu Telegram.");
      await reload();
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const renameChannel = async (channelId: string, currentName: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      setError("Ten kenh khong duoc de trong.");
      return;
    }
    if (trimmed === currentName.trim()) {
      return;
    }
    if (!window.confirm(`Doi ten kenh \"${currentName}\" thanh \"${trimmed}\"?`)) {
      return;
    }

    setRenamingChannels((curr) => ({ ...curr, [channelId]: true }));
    setError("");
    setMessage("");
    try {
      await api.patch(`/api/admin/cinema/channels/${channelId}`, { displayName: trimmed });
      await reload();
      await reloadSelectedChannelDetail(channelId);
      setMessage("Da doi ten kenh.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setRenamingChannels((curr) => ({ ...curr, [channelId]: false }));
    }
  };

  const deleteChannel = async (channelId: string, channelName: string) => {
    if (!window.confirm(`Xoa kenh \"${channelName}\"? Tat ca phim cua kenh nay trong he thong web se bi xoa.`)) {
      return;
    }

    setDeletingChannels((curr) => ({ ...curr, [channelId]: true }));
    setError("");
    setMessage("");
    try {
      await api.delete(`/api/admin/cinema/channels/${channelId}`);
      await reload();
      if (selectedChannelId === channelId) {
        await reloadSelectedChannelDetail(null);
      }
      setMessage("Da xoa kenh.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setDeletingChannels((curr) => ({ ...curr, [channelId]: false }));
    }
  };

  const renameMovie = async (movieId: string, currentTitle: string, nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (!trimmed) {
      setError("Ten phim khong duoc de trong.");
      return;
    }
    if (trimmed === currentTitle.trim()) {
      return;
    }
    if (!window.confirm(`Doi ten phim \"${currentTitle}\" thanh \"${trimmed}\"?`)) {
      return;
    }

    setRenamingMovies((curr) => ({ ...curr, [movieId]: true }));
    setError("");
    setMessage("");
    try {
      await api.patch(`/api/admin/cinema/movies/${movieId}`, { title: trimmed });
      await reload();
      await reloadSelectedChannelDetail(selectedChannelId);
      setMessage("Da doi ten phim.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setRenamingMovies((curr) => ({ ...curr, [movieId]: false }));
    }
  };

  const deleteMovie = async (movieId: string, movieTitle: string) => {
    if (!window.confirm(`Xoa phim \"${movieTitle}\" khoi web?`)) {
      return;
    }

    setDeletingMovies((curr) => ({ ...curr, [movieId]: true }));
    setError("");
    setMessage("");
    try {
      await api.delete(`/api/admin/cinema/movies/${movieId}`);
      await reload();
      await reloadSelectedChannelDetail(selectedChannelId);
      setMessage("Da xoa phim.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setDeletingMovies((curr) => ({ ...curr, [movieId]: false }));
    }
  };

  return {
    runningByChannel,
    localUploading,
    cancellingJobs,
    renamingChannels,
    deletingChannels,
    renamingMovies,
    deletingMovies,
    ensureStorageAndScan,
    startLocalUpload,
    cancelJob,
    retryJob,
    syncChannel,
    renameChannel,
    deleteChannel,
    renameMovie,
    deleteMovie,
  };
}
