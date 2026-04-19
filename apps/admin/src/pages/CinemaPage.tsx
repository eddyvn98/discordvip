import { useState, useMemo } from "react";

// Types
import { CinemaChannel, CinemaScanJob } from "./cinema/cinema.types";

// Helpers
import { 
  getLatestJobByChannel, 
  getActiveJobsCount
} from "./cinema/cinema.helpers";

// Hooks
import { useCinemaFeedback } from "./cinema/hooks/useCinemaFeedback";
import { useCinemaActions } from "./cinema/hooks/useCinemaActions";
import { useCinemaPageData } from "./cinema/hooks/useCinemaPageData";

// Components
import { CinemaHeader } from "./cinema/components/CinemaHeader";
import { CinemaStats } from "./cinema/components/CinemaStats";
import { CinemaLocalSyncCard } from "./cinema/components/CinemaLocalSyncCard";
import { CinemaRecentJobsTable } from "./cinema/components/CinemaRecentJobsTable";
import { CinemaFeedbackPopups } from "./cinema/components/CinemaFeedbackPopups";

export function CinemaPage() {
  const [localPath, setLocalPath] = useState("");

  const { message, setMessage, error, setError, clearFeedback } = useCinemaFeedback();

  const {
    channels,
    jobs,
    loading,
    stats,
    accessMe,
    reload,
  } = useCinemaPageData({ setError });

  const {
    localUploading,
    cancellingJobs,
    cancelJob,
    retryJob,
    startLocalUpload,
  } = useCinemaActions({
    reload,
    reloadSelectedChannelDetail: async () => {},
    selectedChannelId: null,
    accessCapabilities: accessMe?.capabilities,
    setMessage,
    setError,
  });


  const fullSourceChannels = useMemo(
    () => channels.filter((channel) => channel.isEnabled && channel.role === "FULL_SOURCE"),
    [channels]
  );

  const latestJobByChannel = useMemo(
    () => getLatestJobByChannel(jobs),
    [jobs]
  );

  const activeJobsCount = useMemo(
    () => getActiveJobsCount(jobs),
    [jobs]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground animate-pulse font-medium">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CinemaHeader />

      <CinemaStats
        fullSourceChannelsCount={fullSourceChannels.length}
        activeJobsCount={activeJobsCount}
        totalUniqueMovies={stats?.totalUniqueMovies ?? 0}
      />

      <div className="flex flex-col gap-6">
        <CinemaLocalSyncCard
          localPath={localPath}
          onLocalPathChange={setLocalPath}
          onStartUpload={() => startLocalUpload(localPath)}
          localUploading={localUploading}
          canUpload={Boolean(accessMe?.capabilities.globalUpload)}
        />

        <CinemaRecentJobsTable 
          jobs={jobs} 
          channels={channels} 
          onCancel={cancelJob}
          onRetry={retryJob}
          cancellingJobs={cancellingJobs}
        />
      </div>

      <CinemaFeedbackPopups 
        message={message} 
        error={error} 
        onClose={clearFeedback} 
      />
    </div>
  );
}
