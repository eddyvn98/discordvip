import { useState } from "react";
import { api } from "../../../api";

interface UseCinemaActionsProps {
  reload: () => Promise<void>;
  setMessage: (msg: string) => void;
  setError: (err: string) => void;
}

export function useCinemaActions({
  reload,
  setMessage,
  setError,
}: UseCinemaActionsProps) {
  const [runningByChannel, setRunningByChannel] = useState<Record<string, boolean>>({});
  const [localUploading, setLocalUploading] = useState(false);

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
      setMessage("Đã bắt đầu quét toàn bộ và tạo lại preview/thumbnail.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setRunningByChannel((current) => ({ ...current, [channelId]: false }));
    }
  };

  const startLocalUpload = async (localPath: string) => {
    if (!localPath.trim()) {
      setError("Vui lòng nhập đường dẫn thư mục.");
      return;
    }
    setLocalUploading(true);
    setError("");
    setMessage("");
    try {
      await api.post("/api/admin/cinema/upload-local", {
        directoryPath: localPath.trim(),
      });
      setMessage("Đã bắt đầu quá trình upload và đồng bộ từ thư mục local.");
      await reload();
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setLocalUploading(false);
    }
  };

  return {
    runningByChannel,
    localUploading,
    ensureStorageAndScan,
    startLocalUpload,
  };
}
