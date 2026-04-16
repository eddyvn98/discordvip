import { Film, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CinemaChannel, CinemaScanJob } from "../cinema.types";

interface CinemaChannelListItemProps {
  channel: CinemaChannel;
  job?: CinemaScanJob;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function CinemaChannelListItem({
  channel,
  job,
  isSelected,
  onSelect,
}: CinemaChannelListItemProps) {
  const isActive = job?.status === "RUNNING";

  return (
    <div
      onClick={() => onSelect(channel.id)}
      className={cn(
        "flex items-center gap-3 p-3 mb-1 rounded-lg cursor-pointer transition-all border border-transparent",
        isSelected
          ? "bg-primary/10 border-primary/20"
          : "hover:bg-accent hover:border-accent-foreground/5"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Film size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-semibold truncate",
            isSelected
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {channel.displayName}
        </p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {isActive ? "Đang quét..." : "Sẵn sàng"}
        </p>
      </div>
      {isActive && <RefreshCw size={14} className="animate-spin text-primary" />}
      {isSelected && !isActive && <ChevronRight size={14} className="text-primary" />}
    </div>
  );
}
