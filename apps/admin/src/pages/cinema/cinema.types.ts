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
