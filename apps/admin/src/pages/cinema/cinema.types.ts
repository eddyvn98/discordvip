export type CinemaChannel = {
  id: string;
  displayName: string;
  role: "FULL_SOURCE" | "PREVIEW_STORAGE" | "POSTER_STORAGE";
  platform: "TELEGRAM" | "DISCORD";
  sourceChannelId: string;
  isEnabled: boolean;
};

export type CinemaScanJob = {
  id: string;
  channelId: string | null;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "TIMEOUT";
  totalDetected: number;
  totalInserted: number;
  totalFailed: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  lastHeartbeatAt?: string | null;
  failureReason?: string | null;
};
