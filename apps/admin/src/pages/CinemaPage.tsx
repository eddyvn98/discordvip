import { useEffect, useMemo, useState } from "react";
import { 
  Film, 
  RefreshCw, 
  FolderSync, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileVideo,
  Database,
  Search,
  ChevronRight
} from "lucide-react";

import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { datetime } from "../utils/format";
import { cn } from "@/lib/utils";

type CinemaChannel = {
  id: string;
  displayName: string;
  role: "FULL_SOURCE" | "PREVIEW_STORAGE" | "POSTER_STORAGE";
  platform: "TELEGRAM" | "DISCORD";
  sourceChannelId: string;
  isEnabled: boolean;
};

type CinemaScanJob = {
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

export function CinemaPage() {
  const [channels, setChannels] = useState<CinemaChannel[]>([]);
  const [jobs, setJobs] = useState<CinemaScanJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [runningByChannel, setRunningByChannel] = useState<Record<string, boolean>>({});
  const [localPath, setLocalPath] = useState("");
  const [localUploading, setLocalUploading] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [channelRows, jobRows] = await Promise.all([
        api.get<CinemaChannel[]>("/api/admin/cinema/channels"),
        api.get<CinemaScanJob[]>("/api/admin/cinema/jobs?limit=50"),
      ]);
      setChannels(channelRows);
      setJobs(jobRows);
      if (!selectedChannelId && channelRows.length > 0) {
        setSelectedChannelId(channelRows.find(c => c.role === "FULL_SOURCE")?.id || channelRows[0].id);
      }
    } catch (err) {
      setError("Không thể tải dữ liệu.");
    }
  };

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void api
        .get<CinemaScanJob[]>("/api/admin/cinema/jobs?limit=50")
        .then(setJobs)
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const fullSourceChannels = useMemo(
    () => channels.filter((channel) => channel.isEnabled && channel.role === "FULL_SOURCE"),
    [channels],
  );

  const selectedChannel = useMemo(
    () => channels.find(c => c.id === selectedChannelId),
    [channels, selectedChannelId]
  );

  const latestJobByChannel = useMemo(() => {
    const map = new Map<string, CinemaScanJob>();
    for (const job of jobs) {
      if (!map.has(job.channelId)) map.set(job.channelId, job);
    }
    return map;
  }, [jobs]);

  const activeJobsCount = useMemo(() => jobs.filter(j => j.status === "RUNNING").length, [jobs]);

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
      await load();
      setMessage("Đã bắt đầu quét toàn bộ và tạo lại preview/thumbnail.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setRunningByChannel((current) => ({ ...current, [channelId]: false }));
    }
  };

  const startLocalUpload = async () => {
    if (!localPath.trim()) {
      setError("Vui lòng nhập đường dẫn thư mục.");
      return;
    }
    setLocalUploading(true);
    setError("");
    setMessage("");
    try {
      await api.post("/api/admin/cinema/upload-local", { directoryPath: localPath.trim() });
      setMessage("Đã bắt đầu quá trình upload và đồng bộ từ thư mục local.");
      await load();
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setLocalUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cinema Workspace</h1>
          <p className="text-muted-foreground mt-1">Quản lý đồng bộ, quét phim và tạo nội dung preview tự động.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kênh Full Source</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullSourceChannels.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Công việc đang chạy</CardTitle>
            <RefreshCw className={cn("h-4 w-4 text-primary", activeJobsCount > 0 && "spin")} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Phim đã quét</CardTitle>
            <FileVideo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.reduce((acc, j) => acc + j.totalDetected, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Left: Channels & Sync */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Kênh nguồn</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {fullSourceChannels.map(channel => {
                const job = latestJobByChannel.get(channel.id);
                const isActive = job?.status === "RUNNING";
                const isSelected = selectedChannelId === channel.id;
                return (
                  <div 
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 mb-1 rounded-lg cursor-pointer transition-all border border-transparent",
                      isSelected ? "bg-primary/10 border-primary/20" : "hover:bg-accent hover:border-accent-foreground/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <Film size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>{channel.displayName}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                         {isActive ? "Đang quét..." : "Sẵn sàng"}
                      </p>
                    </div>
                    {isActive && <RefreshCw size={14} className="animate-spin text-primary" />}
                    {isSelected && !isActive && <ChevronRight size={14} className="text-primary" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderSync size={18} className="text-primary" />
                Đồng bộ Local
              </CardTitle>
              <CardDescription className="text-xs">Nhập folder server để upload tự động.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input 
                placeholder="E:\Movies\New" 
                value={localPath}
                onChange={e => setLocalPath(e.target.value)}
                className="bg-background/50 h-9"
              />
              <Button className="w-full h-9" onClick={startLocalUpload} disabled={localUploading}>
                {localUploading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FolderSync className="mr-2 h-4 w-4" />}
                {localUploading ? "Đang Sync..." : "Bắt đầu Sync"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Job Details */}
        <div className="flex flex-col gap-8">
          {selectedChannel ? (
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-bold">{selectedChannel.displayName}</CardTitle>
                    <Badge variant="secondary">{selectedChannel.platform}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">Channel ID: {selectedChannel.sourceChannelId}</p>
                </div>
                <Button 
                  onClick={() => void ensureStorageAndScan(selectedChannel.id)}
                  disabled={runningByChannel[selectedChannel.id]}
                  className="gap-2"
                >
                  <RefreshCw size={18} className={cn(runningByChannel[selectedChannel.id] && "animate-spin")} />
                  {runningByChannel[selectedChannel.id] ? "Đang chuẩn bị..." : "Chạy quét & Tạo preview"}
                </Button>
              </CardHeader>

              <CardContent>
                {latestJobByChannel.get(selectedChannel.id) ? (
                  <div className="bg-accent/40 rounded-xl p-6 border">
                    {(() => {
                      const job = latestJobByChannel.get(selectedChannel.id)!;
                      const total = Math.max(0, job.totalDetected || 0);
                      const done = Math.max(0, job.totalInserted + job.totalFailed);
                      const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                      
                      return (
                        <>
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                              {job.status === "RUNNING" ? <RefreshCw className="h-5 w-5 animate-spin text-primary" /> : 
                               job.status === "SUCCEEDED" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                               <AlertCircle className="h-5 w-5 text-destructive" />}
                              <span className="font-bold text-lg">Trạng thái: {job.status}</span>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground tabular-nums">
                              {done} / {total} phim ({percent}%)
                            </span>
                          </div>
                          
                          <div className="h-3 w-full overflow-hidden rounded-full bg-muted mb-6">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                job.status === "FAILED" ? "bg-destructive" : "bg-primary"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-background/80 rounded-lg p-3 text-center border">
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Thành công</p>
                              <p className="text-xl font-black text-green-500">{job.totalInserted}</p>
                            </div>
                            <div className="bg-background/80 rounded-lg p-3 text-center border">
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Thất bại</p>
                              <p className="text-xl font-black text-destructive">{job.totalFailed}</p>
                            </div>
                            <div className="bg-background/80 rounded-lg p-3 text-center border">
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Cập nhật lúc</p>
                              <p className="text-sm font-bold flex items-center justify-center h-7">{datetime(job.updatedAt)}</p>
                            </div>
                          </div>

                          {job.failureReason && (
                            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium flex gap-3 items-start">
                              <AlertCircle size={18} className="shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-bold block mb-0.5">Lỗi hệ thống:</span>
                                {job.failureReason}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center gap-4 border border-dashed rounded-xl grayscale opacity-50">
                    <Clock className="h-12 w-12 text-muted-foreground/20" />
                    <p className="text-muted-foreground font-medium">Chưa có lịch sử quét cho kênh này.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-[400px] flex-col items-center justify-center border-dashed gap-4 grayscale opacity-30">
              <Film size={64} className="text-muted-foreground/20" />
              <p className="text-muted-foreground font-medium">Chọn một kênh bên trái để bắt đầu quản trị.</p>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-base font-semibold">Công việc gần đây</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Thời gian</TableHead>
                    <TableHead>Kênh</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right pr-6">Tiến độ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.slice(0, 10).map(job => {
                    const jobChannel = channels.find(c => c.id === job.channelId);
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="pl-6 text-xs text-muted-foreground">{datetime(job.createdAt)}</TableCell>
                        <TableCell className="font-medium text-xs">{jobChannel?.displayName || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            job.status === "SUCCEEDED" ? "default" : 
                            job.status === "RUNNING" ? "secondary" : 
                            job.status === "FAILED" ? "destructive" : "outline"
                          } className="text-[10px] h-5">
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 text-xs font-mono tabular-nums">
                          {job.totalInserted + job.totalFailed} / {job.totalDetected}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Popups */}
      {message && <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">{message}</div>}
      {error && <div className="fixed bottom-6 right-6 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">{error}</div>}
    </div>
  );
}
