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
}

export function CinemaRecentJobsTable({
  jobs,
  channels,
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
              <TableHead className="text-right pr-6">Tiến độ</TableHead>
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
                          : "outline"
                      }
                      className="text-[10px] h-5"
                    >
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
  );
}
