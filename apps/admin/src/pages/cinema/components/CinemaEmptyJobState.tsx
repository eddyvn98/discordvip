import { Clock } from "lucide-react";

export function CinemaEmptyJobState() {
  return (
    <div className="py-20 text-center flex flex-col items-center gap-4 border border-dashed rounded-xl grayscale opacity-50">
      <Clock className="h-12 w-12 text-muted-foreground/20" />
      <p className="text-muted-foreground font-medium">
        Chưa có lịch sử quét cho kênh này.
      </p>
    </div>
  );
}
