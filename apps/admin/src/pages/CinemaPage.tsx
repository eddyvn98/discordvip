import { useState, useMemo } from "react";

// Types
import { CinemaChannel, CinemaScanJob } from "./cinema/cinema.types";

// Helpers
import { 
  getLatestJobByChannel, 
  getActiveJobsCount, 
  getTotalDetectedMovies 
} from "./cinema/cinema.helpers";

// Hooks
import { useCinemaFeedback } from "./cinema/hooks/useCinemaFeedback";
import { useCinemaActions } from "./cinema/hooks/useCinemaActions";
import { useCinemaPageData } from "./cinema/hooks/useCinemaPageData";

// Components
import { CinemaHeader } from "./cinema/components/CinemaHeader";
import { CinemaStats } from "./cinema/components/CinemaStats";
import { CinemaChannelList } from "./cinema/components/CinemaChannelList";
import { CinemaLocalSyncCard } from "./cinema/components/CinemaLocalSyncCard";
import { CinemaChannelDetails } from "./cinema/components/CinemaChannelDetails";
import { CinemaRecentJobsTable } from "./cinema/components/CinemaRecentJobsTable";
import { CinemaFeedbackPopups } from "./cinema/components/CinemaFeedbackPopups";

export function CinemaPage() {
  const [localPath, setLocalPath] = useState("");

  const { message, setMessage, error, setError } = useCinemaFeedback();

  const {
    channels,
    jobs,
    loading,
    selectedChannelId,
    setSelectedChannelId,
    selectedChannel,
    reload,
  } = useCinemaPageData({ setError });

  const {
    runningByChannel,
    localUploading,
    cancellingJobs,
    ensureStorageAndScan,
    startLocalUpload,
    cancelJob,
    retryJob,
  } = useCinemaActions({ reload, setMessage, setError });

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

  const totalDetectedMovies = useMemo(
    () => getTotalDetectedMovies(jobs),
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
        totalDetectedMovies={totalDetectedMovies}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
        <div className="flex flex-col gap-6">
          <CinemaChannelList
            channels={fullSourceChannels}
            latestJobByChannel={latestJobByChannel}
            selectedChannelId={selectedChannelId}
            onSelect={setSelectedChannelId}
          />

          <CinemaLocalSyncCard
            localPath={localPath}
            onLocalPathChange={setLocalPath}
            onStartUpload={() => startLocalUpload(localPath)}
            localUploading={localUploading}
          />
        </div>

        <div className="flex flex-col gap-8">
          <CinemaChannelDetails
            channel={selectedChannel}
            activeJob={selectedChannel ? latestJobByChannel.get(selectedChannel.id) : undefined}
            onScan={ensureStorageAndScan}
            isScanning={selectedChannel ? !!runningByChannel[selectedChannel.id] : false}
          />

          <CinemaRecentJobsTable 
            jobs={jobs} 
            channels={channels} 
            onCancel={cancelJob}
            onRetry={retryJob}
            cancellingJobs={cancellingJobs}
          />
        </div>
      </div>

      <CinemaFeedbackPopups message={message} error={error} />
    </div>
  );
}
