import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Film, Pencil, Trash2, RefreshCw, Globe, Send, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "../../../api";
import { CinemaChannel, CinemaChannelDetail, CinemaScanJob } from "../cinema.types";
import { CinemaJobOverview } from "./CinemaJobOverview";
import { CinemaEmptyJobState } from "./CinemaEmptyJobState";

interface CinemaMovieGridProps {
  channel: CinemaChannel;
  channelDetail: CinemaChannelDetail | null;
  loadingChannelDetail: boolean;
  activeJob?: CinemaScanJob;
  onBack: () => void;
  onScan: (id: string) => void;
  onSyncStatus?: (id: string) => void;
  onRenameChannel: (id: string, currentName: string, nextName: string) => void;
  onDeleteChannel: (id: string, channelName: string) => void;
  onRenameMovie: (id: string, currentTitle: string, nextTitle: string) => void;
  onDeleteMovie: (id: string, movieTitle: string) => void;
  renamingChannels: Record<string, boolean>;
  deletingChannels: Record<string, boolean>;
  renamingMovies: Record<string, boolean>;
  deletingMovies: Record<string, boolean>;
  isScanning: boolean;
}

const movieGradients = [
  "from-slate-600 to-slate-700",
  "from-zinc-600 to-zinc-700",
  "from-neutral-600 to-neutral-700",
  "from-stone-600 to-stone-700",
  "from-gray-600 to-gray-700",
  "from-blue-600 to-blue-700",
];

export function CinemaMovieGrid({
  channel,
  channelDetail,
  loadingChannelDetail,
  activeJob,
  onBack,
  onScan,
  onSyncStatus,
  onRenameChannel,
  onDeleteChannel,
  onRenameMovie,
  onDeleteMovie,
  renamingChannels,
  deletingChannels,
  renamingMovies,
  deletingMovies,
  isScanning,
}: CinemaMovieGridProps) {
  const [remoteCount, setRemoteCount] = useState<number | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [channelNameDraft, setChannelNameDraft] = useState("");

  const currentChannelId = channel?.id ?? null;

  useEffect(() => {
    if (channel?.platform === "TELEGRAM" && channel.sourceChannelId) {
      setRemoteCount(null);
      setLoadingRemote(true);
      api
        .get<{ total: number }>(`/api/admin/cinema/channels/${channel.id}/remote-stats`)
        .then((res) => setRemoteCount(res.total))
        .catch(() => setRemoteCount(null))
        .finally(() => setLoadingRemote(false));
    } else {
      setRemoteCount(null);
    }
  }, [channel?.id, channel?.platform, channel?.sourceChannelId]);

  useEffect(() => {
    setChannelNameDraft(channel?.displayName ?? "");
  }, [channel?.id, channel?.displayName]);

  const movies = useMemo(() => channelDetail?.movies ?? [], [channelDetail?.movies]);

  return (
    <div className="space-y-6">
      {/* Channel Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft size={20} />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl truncate">{channel.displayName}</CardTitle>
                  <Badge variant="secondary">{channel.platform}</Badge>
                  {channel.remoteStatus === "DELETED_REMOTE" && <Badge variant="destructive">REMOTE DELETED</Badge>}
                  {channel.remoteStatus === "ACTIVE" && (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      REMOTE ACTIVE
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-mono truncate">Channel ID: {channel.sourceChannelId}</p>

                <div className="flex items-center gap-6 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Globe size={14} className="text-primary" />
                    <span className="text-muted-foreground">Tren Web:</span>
                    <span className="font-bold text-primary">{channel.syncedItemsCount ?? 0}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{channel._count?.items ?? 0} phim</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Send size={14} className="text-blue-400" />
                    <span className="text-muted-foreground">Tren Telegram:</span>
                    <span className="font-bold text-blue-400">{loadingRemote ? "..." : remoteCount ?? "N/A"}</span>
                    <span className="text-muted-foreground">phim</span>
                  </div>
                </div>
                {channel.remoteStatus === "DELETED_REMOTE" && (
                  <p className="text-xs text-destructive mt-2 font-medium italic">
                    Canh bao: Kenh nay khong con ton tai hoac khong the truy cap tren Telegram.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => onSyncStatus && onSyncStatus(channel.id)} className="gap-2">
                <RefreshCw size={16} />
                Check Sync
              </Button>
              <Button onClick={() => onScan(channel.id)} disabled={isScanning} className="gap-2">
                <RefreshCw size={18} className={cn(isScanning && "animate-spin")} />
                {isScanning ? "Dang chuan bi..." : "Chay quet & Tao preview"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Channel Management */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-sm font-semibold">Quan ly kenh</div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <Input
              value={channelNameDraft}
              onChange={(event) => setChannelNameDraft(event.target.value)}
              placeholder="Ten kenh"
              className="md:max-w-md"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                disabled={!!renamingChannels[channel.id]}
                onClick={() => onRenameChannel(channel.id, channel.displayName, channelNameDraft)}
              >
                <Pencil size={14} />
                {renamingChannels[channel.id] ? "Dang luu..." : "Doi ten"}
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={!!deletingChannels[channel.id]}
                onClick={() => onDeleteChannel(channel.id, channel.displayName)}
              >
                <Trash2 size={14} />
                {deletingChannels[channel.id] ? "Dang xoa..." : "Xoa kenh"}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Tong so phim trong kenh: {channelDetail?.movieCount ?? channel._count?.items ?? 0}
          </div>
        </CardContent>
      </Card>

      {/* Movies Grid */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Danh sach phim</h2>
        {loadingChannelDetail && <div className="text-sm text-muted-foreground">Dang tai...</div>}
      </div>

      {movies.length === 0 && !loadingChannelDetail && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Film size={48} className="text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Khong co phim trong kenh nay.</p>
          </CardContent>
        </Card>
      )}

      {movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {movies.map((movie, index) => {
            const gradient = movieGradients[index % movieGradients.length];
            const posterUrl = movie.posterUrl;

            return (
              <Card
                key={movie.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-105 group"
              >
                {/* Poster/Thumbnail */}
                <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={cn("absolute inset-0 flex flex-col items-center justify-center p-3 text-center", posterUrl ? 'hidden' : '', "bg-gradient-to-br", gradient)}>
                    <ImageIcon size={32} className="text-white/50 mb-2" />
                    <p className="text-white/80 text-xs font-medium line-clamp-2">{movie.title}</p>
                  </div>
                  
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-8 h-8 shrink-0"
                      disabled={!!renamingMovies[movie.id]}
                      onClick={() => {
                        const nextTitle = window.prompt("Nhap ten phim moi", movie.title);
                        if (nextTitle === null) return;
                        onRenameMovie(movie.id, movie.title, nextTitle);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="w-8 h-8 shrink-0"
                      disabled={!!deletingMovies[movie.id]}
                      onClick={() => onDeleteMovie(movie.id, movie.title)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-3">
                  <p className="text-xs font-medium truncate">{movie.title}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{movie.remoteStatus}</Badge>
                    <span>{new Date(movie.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Job Overview */}
      {activeJob ? <CinemaJobOverview job={activeJob} /> : <CinemaEmptyJobState />}
    </div>
  );
}
