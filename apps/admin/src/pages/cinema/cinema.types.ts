export type CinemaChannel = {
  id: string;
  displayName: string;
  role: "FULL_SOURCE" | "PREVIEW_STORAGE" | "POSTER_STORAGE";
  platform: "TELEGRAM" | "DISCORD";
  sourceChannelId: string;
  isEnabled: boolean;
  remoteStatus?: string;
  syncedItemsCount?: number;
  posterUrl?: string | null;
  _count?: {
    items: number;
    scanJobs: number;
  };
};

export type CinemaChannelMovie = {
  id: string;
  title: string;
  remoteStatus: string;
  createdAt: string;
  posterUrl?: string | null;
};

export type CinemaChannelDetail = {
  id: string;
  displayName: string;
  role: "FULL_SOURCE" | "PREVIEW_STORAGE" | "POSTER_STORAGE";
  platform: "TELEGRAM" | "DISCORD";
  sourceChannelId: string;
  isEnabled: boolean;
  remoteStatus?: string;
  movieCount: number;
  movies: CinemaChannelMovie[];
};

export type CinemaWebMovie = {
  id: string;
  title: string;
  remoteStatus: string;
  createdAt: string;
  channelId: string;
  channel: {
    id: string;
    displayName: string;
    sourceChannelId: string;
    platform: "TELEGRAM" | "DISCORD";
  };
};

export type CinemaStats = {
  totalUniqueMovies: number;
  totalChannels: number;
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

export type CinemaAccessCapabilities = {
  globalView: boolean;
  globalUpload: boolean;
  globalForward: boolean;
  globalManage: boolean;
  globalDelete: boolean;
};

export type CinemaAccessMeResponse = {
  actor: {
    platform: "discord" | "telegram";
    platformUserId: string;
    displayName?: string | null;
  };
  isSuperAdmin: boolean;
  mode: "super_admin" | "mapped" | "legacy_admin";
  capabilities: CinemaAccessCapabilities;
  principal?: {
    id: string;
    permissions: Array<{
      id: string;
      channelId: string | null;
      canView: boolean;
      canUpload: boolean;
      canForward: boolean;
      canManage: boolean;
      canDelete: boolean;
    }>;
  } | null;
};
