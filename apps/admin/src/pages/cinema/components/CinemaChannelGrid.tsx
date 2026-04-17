import { Film, Play, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CinemaChannel, CinemaScanJob } from "../cinema.types";

interface CinemaChannelGridProps {
  channels: CinemaChannel[];
  latestJobByChannel: Map<string, CinemaScanJob>;
  selectedChannelId: string | null;
  onSelect: (channelId: string) => void;
}

const gradients = [
  "from-violet-600 to-purple-700",
  "from-blue-600 to-cyan-600",
  "from-emerald-600 to-teal-600",
  "from-orange-600 to-red-600",
  "from-pink-600 to-rose-600",
  "from-indigo-600 to-blue-600",
];

export function CinemaChannelGrid({
  channels,
  latestJobByChannel,
  selectedChannelId,
  onSelect,
}: CinemaChannelGridProps) {
  if (channels.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Film size={48} className="text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Khong co kenh phim nao.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {channels.map((channel, index) => {
        const latestJob = latestJobByChannel.get(channel.id);
        const isSelected = selectedChannelId === channel.id;
        const gradient = gradients[index % gradients.length];
        const hasPoster = channel.posterUrl && channel.posterUrl.length > 0;

        return (
          <Card
            key={channel.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg overflow-hidden",
              isSelected && "ring-2 ring-primary shadow-lg"
            )}
            onClick={() => onSelect(channel.id)}
          >
            {/* Thumbnail/Poster */}
            <div className="aspect-video relative overflow-hidden bg-slate-800">
              {hasPoster ? (
                <img
                  src={channel.posterUrl!}
                  alt={channel.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play size={32} className="text-white fill-white" />
                  </div>
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {latestJob?.status === "RUNNING" && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 text-white text-xs">
                    <Activity size={10} className="mr-1 animate-spin" />
                    Scanning
                  </Badge>
                </div>
              )}
            </div>
            
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{channel.displayName}</h3>
              
              <div className="flex items-center justify-between text-xs">
                <Badge variant="secondary" className="text-xs">
                  {channel.platform}
                </Badge>
                <span className="text-muted-foreground">
                  {channel._count?.items ?? 0} phim
                </span>
              </div>

              {latestJob && latestJob.status !== "RUNNING" && (
                <div className="pt-2 border-t text-xs">
                  <span className="text-muted-foreground">Last: </span>
                  <span className={cn(
                    latestJob.status === "SUCCEEDED" && "text-green-500",
                    latestJob.status === "FAILED" && "text-red-500",
                    latestJob.status === "CANCELLED" && "text-orange-500"
                  )}>
                    {latestJob.status}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
