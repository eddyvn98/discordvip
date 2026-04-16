import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { CinemaScanJob } from "../cinema.types";
import { getJobProgress } from "../cinema.helpers";
import { datetime } from "../../../utils/format";
import { cn } from "@/lib/utils";

interface CinemaJobOverviewProps {
  job: CinemaScanJob;
}

export function CinemaJobOverview({ job }: CinemaJobOverviewProps) {
  const { total, done, percent } = getJobProgress(job);

  return (
    <div className="bg-accent/40 rounded-xl p-6 border">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {job.status === "RUNNING" ? (
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          ) : job.status === "SUCCEEDED" ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
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
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
            Thành công
          </p>
          <p className="text-xl font-black text-green-500">{job.totalInserted}</p>
        </div>
        <div className="bg-background/80 rounded-lg p-3 text-center border">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
            Thất bại
          </p>
          <p className="text-xl font-black text-destructive">{job.totalFailed}</p>
        </div>
        <div className="bg-background/80 rounded-lg p-3 text-center border">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
            Cập nhật lúc
          </p>
          <p className="text-sm font-bold flex items-center justify-center h-7">
            {datetime(job.updatedAt)}
          </p>
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
    </div>
  );
}
