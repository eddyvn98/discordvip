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
import { CinemaFeedbackPopups } from "./cinema/components/CinemaFeedbackPopups";
import { CinemaChannelGrid } from "./cinema/components/CinemaChannelGrid";
import { CinemaMovieGrid } from "./cinema/components/CinemaMovieGrid";

export function CinemaChannelsPage() {
  // Quản lý channel được chọn hoàn toàn bằng local state
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const { message, setMessage, error, setError, clearFeedback } = useCinemaFeedback();

  const {
    channels,
    jobs,
    loading,
    selectedChannelDetail,
    loadingChannelDetail,
    accessMe,
    reload,
    reloadSelectedChannelDetail,
  } = useCinemaPageData({ setError, forceSelectedChannelId: selectedChannelId });

  const {
    runningByChannel,
    renamingChannels,
    deletingChannels,
    renamingMovies,
    deletingMovies,
    ensureStorageAndScan,
    syncChannel,
    renameChannel,
    deleteChannel,
    renameMovie,
    deleteMovie,
  } = useCinemaActions({
    reload,
    reloadSelectedChannelDetail,
    selectedChannelId,
    accessCapabilities: accessMe?.capabilities,
    setMessage,
    setError,
  });

  const canDoChannelAction = (
    action: "view" | "upload" | "forward" | "manage" | "delete",
    channelId: string,
  ) => {
    if (!accessMe) return true;
    if (accessMe.isSuperAdmin || accessMe.mode === "legacy_admin") return true;
    const permissions = accessMe.principal?.permissions ?? [];
    return permissions.some((permission) => {
      const matched = permission.channelId === null || permission.channelId === channelId;
      if (!matched) return false;
      if (action === "view") return permission.canView;
      if (action === "upload") return permission.canUpload;
      if (action === "forward") return permission.canForward;
      if (action === "manage") return permission.canManage;
      return permission.canDelete;
    });
  };

  const fullSourceChannels = useMemo(
    () => channels.filter((channel) => channel.isEnabled && channel.role === "FULL_SOURCE"),
    [channels]
  );

  const latestJobByChannel = useMemo(
    () => getLatestJobByChannel(jobs),
    [jobs]
  );

  const selectedChannel = useMemo(
    () => fullSourceChannels.find((c) => c.id === selectedChannelId) || null,
    [fullSourceChannels, selectedChannelId]
  );

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const handleBackToChannels = () => {
    setSelectedChannelId(null);
  };

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

      {selectedChannelId && selectedChannel ? (
        <div className="flex flex-col gap-6">
          <CinemaMovieGrid
            channel={selectedChannel}
            channelDetail={selectedChannelDetail}
            loadingChannelDetail={loadingChannelDetail}
            activeJob={latestJobByChannel.get(selectedChannel.id)}
            onBack={handleBackToChannels}
            onScan={ensureStorageAndScan}
            onSyncStatus={syncChannel}
            onRenameChannel={renameChannel}
            onDeleteChannel={deleteChannel}
            onRenameMovie={renameMovie}
            onDeleteMovie={deleteMovie}
            renamingChannels={renamingChannels}
            deletingChannels={deletingChannels}
            renamingMovies={renamingMovies}
            deletingMovies={deletingMovies}
            isScanning={!!runningByChannel[selectedChannel.id]}
            canScan={canDoChannelAction("upload", selectedChannel.id)}
            canManage={canDoChannelAction("manage", selectedChannel.id)}
            canDelete={canDoChannelAction("delete", selectedChannel.id)}
          />
        </div>
      ) : (
        <CinemaChannelGrid
          channels={fullSourceChannels}
          latestJobByChannel={latestJobByChannel}
          selectedChannelId={selectedChannelId}
          onSelect={handleChannelSelect}
        />
      )}

      <CinemaFeedbackPopups 
        message={message} 
        error={error} 
        onClose={clearFeedback} 
      />
    </div>
  );
}
