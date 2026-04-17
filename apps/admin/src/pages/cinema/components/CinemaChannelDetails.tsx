import { useEffect, useMemo, useState } from "react";
import { Check, Film, RefreshCw, Globe, Send, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "../../../api";
import { CinemaChannel, CinemaChannelDetail, CinemaScanJob } from "../cinema.types";
import { CinemaJobOverview } from "./CinemaJobOverview";
import { CinemaEmptyJobState } from "./CinemaEmptyJobState";

interface CinemaChannelDetailsProps {
  channel: CinemaChannel | null;
  channelDetail: CinemaChannelDetail | null;
  loadingChannelDetail: boolean;
  activeJob?: CinemaScanJob;
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

export function CinemaChannelDetails({
  channel,
  channelDetail,
  loadingChannelDetail,
  activeJob,
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
}: CinemaChannelDetailsProps) {
  const [remoteCount, setRemoteCount] = useState<number | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [channelNameDraft, setChannelNameDraft] = useState("");
  const [movieNameDrafts, setMovieNameDrafts] = useState<Record<string, string>>({});
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);

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

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const movie of channelDetail?.movies ?? []) {
      nextDrafts[movie.id] = movie.title;
    }
    setMovieNameDrafts(nextDrafts);
  }, [channelDetail?.id, channelDetail?.movies]);

  const movies = useMemo(() => channelDetail?.movies ?? [], [channelDetail?.movies]);
  const sortedMovies = useMemo(
    () => [...movies].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [movies]
  );

  const cancelMovieEdit = (movieId: string, originalTitle: string) => {
    setMovieNameDrafts((curr) => ({
      ...curr,
      [movieId]: originalTitle,
    }));
    setEditingMovieId((curr) => (curr === movieId ? null : curr));
  };

  if (!channel) {
    return (
      <Card className="flex h-[400px] flex-col items-center justify-center border-dashed gap-4 grayscale opacity-30">
        <Film size={64} className="text-muted-foreground/20" />
        <p className="text-muted-foreground font-medium">Chon mot kenh ben trai de bat dau quan tri.</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl font-bold">{channel.displayName}</CardTitle>
            <Badge variant="secondary">{channel.platform}</Badge>
            {channel.remoteStatus === "DELETED_REMOTE" && <Badge variant="destructive">REMOTE DELETED</Badge>}
            {channel.remoteStatus === "ACTIVE" && (
              <Badge variant="outline" className="border-green-500 text-green-500">
                REMOTE ACTIVE
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Channel ID: {channel.sourceChannelId}</p>

          <div className="flex items-center gap-6 mt-4">
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
            <p className="text-xs text-destructive mt-1 font-medium italic">Canh bao: Kenh nay khong con ton tai hoac khong the truy cap tren Telegram.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onSyncStatus && onSyncStatus(channel.id)} className="gap-2">
            <RefreshCw size={16} />
            Check Sync
          </Button>
          <Button onClick={() => onScan(channel.id)} disabled={isScanning} className="gap-2">
            <RefreshCw size={18} className={cn(isScanning && "animate-spin")} />
            {isScanning ? "Dang chuan bi..." : "Chay quet & Tao preview"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4 space-y-3">
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
          <div className="text-xs text-muted-foreground">Tong so phim trong kenh: {channelDetail?.movieCount ?? channel._count?.items ?? 0}</div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Danh sach phim trong kenh</div>
            {loadingChannelDetail && <div className="text-xs text-muted-foreground">Dang tai...</div>}
          </div>

          {sortedMovies.length === 0 && !loadingChannelDetail && (
            <div className="text-sm text-muted-foreground">Khong co phim trong kenh nay.</div>
          )}

          {sortedMovies.length > 0 && (
            <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
              {sortedMovies.map((movie) => {
                const isEditing = editingMovieId === movie.id;
                const isRenaming = !!renamingMovies[movie.id];
                const isDeleting = !!deletingMovies[movie.id];

                return (
                  <div key={movie.id} className="rounded-lg border bg-card/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{movie.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            {movie.remoteStatus}
                          </Badge>
                          <span>•</span>
                          <span>{new Date(movie.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isRenaming || isDeleting || currentChannelId !== channel.id}
                          onClick={() => {
                            setEditingMovieId(movie.id);
                            setMovieNameDrafts((curr) => ({ ...curr, [movie.id]: curr[movie.id] ?? movie.title }));
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={isRenaming || isDeleting || currentChannelId !== channel.id}
                          onClick={() => onDeleteMovie(movie.id, movie.title)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 space-y-2">
                        <Input
                          value={movieNameDrafts[movie.id] ?? movie.title}
                          onChange={(event) =>
                            setMovieNameDrafts((curr) => ({
                              ...curr,
                              [movie.id]: event.target.value,
                            }))
                          }
                          placeholder="Ten phim"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={isRenaming}
                            onClick={() => cancelMovieEdit(movie.id, movie.title)}
                          >
                            <X size={13} />
                            Huy
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1"
                            disabled={isRenaming}
                            onClick={() => {
                              onRenameMovie(movie.id, movie.title, movieNameDrafts[movie.id] ?? movie.title);
                              setEditingMovieId((curr) => (curr === movie.id ? null : curr));
                            }}
                          >
                            <Check size={13} />
                            {isRenaming ? "Dang luu..." : "Luu"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {activeJob ? <CinemaJobOverview job={activeJob} /> : <CinemaEmptyJobState />}
      </CardContent>
    </Card>
  );
}
