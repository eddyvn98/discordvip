import { 
  Database, 
  RefreshCw, 
  FileVideo 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CinemaStatsProps {
  fullSourceChannelsCount: number;
  activeJobsCount: number;
  totalUniqueMovies: number;
}

export function CinemaStats({
  fullSourceChannelsCount,
  activeJobsCount,
  totalUniqueMovies,
}: CinemaStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Kênh Full Source
          </CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fullSourceChannelsCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Công việc đang chạy
          </CardTitle>
          <RefreshCw
            className={cn("h-4 w-4 text-primary", activeJobsCount > 0 && "spin")}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeJobsCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tổng phim
          </CardTitle>
          <FileVideo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUniqueMovies}</div>
        </CardContent>
      </Card>
    </div>
  );
}
