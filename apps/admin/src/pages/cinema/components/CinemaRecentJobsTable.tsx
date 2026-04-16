import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { datetime } from "../../../utils/format";
import { CinemaChannel, CinemaScanJob } from "../cinema.types";

interface CinemaRecentJobsTableProps {
  jobs: CinemaScanJob[];
  channels: CinemaChannel[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  cancellingJobs: Record<string, boolean>;
}

export function CinemaRecentJobsTable({
  jobs,
  channels,
  onCancel,
  onRetry,
  cancellingJobs,
}: CinemaRecentJobsTableProps) {
  return (
    <Card>
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-base font-semibold">
          Công việc gần đây
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Thời gian</TableHead>
              <TableHead>Kênh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tiến độ</TableHead>
              <TableHead className="text-right pr-6">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.slice(0, 10).map((job) => {
              const jobChannel = channels.find((c) => c.id === job.channelId);
              return (
                <TableRow key={job.id}>
                  <TableCell className="pl-6 text-xs text-muted-foreground">
                    {datetime(job.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium text-xs">
                    {jobChannel?.displayName || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        job.status === "SUCCEEDED"
                          ? "default"
                          : job.status === "RUNNING"
                          ? "secondary"
                          : job.status === "FAILED"
                          ? "destructive"
                          : job.status === "CANCELLED" || job.status === "TIMEOUT"
                          ? "outline"
                          : "outline"
                      }
                      className={`text-[10px] h-5 ${
                        job.status === "CANCELLED" || job.status === "TIMEOUT" ? "border-orange-500 text-orange-500" : ""
                      } ${job.status === "RUNNING" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}`}
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono tabular-nums text-muted-foreground">
                        <span>{Math.round(job.progress * 100)}%</span>
                        <span>{job.totalInserted + job.totalFailed} / {job.totalDetected}</span>
                      </div>
                      <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            job.status === "FAILED" ? "bg-destructive" : 
                            job.status === "CANCELLED" ? "bg-orange-500" : "bg-primary"
                          }`}
                          style={{ width: `${job.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                      {job.status === "RUNNING" && (
                        <button
                          onClick={() => onCancel(job.id)}
                          disabled={cancellingJobs[job.id]}
                          className="text-[10px] font-medium text-orange-500 hover:text-orange-600 disabled:opacity-50 transition-colors"
                        >
                          {cancellingJobs[job.id] ? "Đang dừng..." : "Dừng"}
                        </button>
                      )}
                      {(job.status === "FAILED" || job.status === "CANCELLED" || job.status === "TIMEOUT") && job.channelId && (
                        <button
                          onClick={() => onRetry(job.id)}
                          className="text-[10px] font-medium text-primary hover:underline transition-colors"
                        >
                          Thử lại
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
