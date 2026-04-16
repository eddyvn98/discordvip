import { Film, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CinemaChannel, CinemaScanJob } from "../cinema.types";
import { CinemaJobOverview } from "./CinemaJobOverview";
import { CinemaEmptyJobState } from "./CinemaEmptyJobState";

interface CinemaChannelDetailsProps {
  channel: CinemaChannel | null;
  activeJob?: CinemaScanJob;
  onScan: (id: string) => void;
  isScanning: boolean;
}

export function CinemaChannelDetails({
  channel,
  activeJob,
  onScan,
  isScanning,
}: CinemaChannelDetailsProps) {
  if (!channel) {
    return (
      <Card className="flex h-[400px] flex-col items-center justify-center border-dashed gap-4 grayscale opacity-30">
        <Film size={64} className="text-muted-foreground/20" />
        <p className="text-muted-foreground font-medium">
          Chọn một kênh bên trái để bắt đầu quản trị.
        </p>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl font-bold">
              {channel.displayName}
            </CardTitle>
            <Badge variant="secondary">{channel.platform}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Channel ID: {channel.sourceChannelId}
          </p>
        </div>
        <Button
          onClick={() => onScan(channel.id)}
          disabled={isScanning}
          className="gap-2"
        >
          <RefreshCw
            size={18}
            className={cn(isScanning && "animate-spin")}
          />
          {isScanning ? "Đang chuẩn bị..." : "Chạy quét & Tạo preview"}
        </Button>
      </CardHeader>

      <CardContent>
        {activeJob ? (
          <CinemaJobOverview job={activeJob} />
        ) : (
          <CinemaEmptyJobState />
        )}
      </CardContent>
    </Card>
  );
}
