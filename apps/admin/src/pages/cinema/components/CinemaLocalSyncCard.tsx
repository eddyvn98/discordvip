import { FolderSync, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";

interface CinemaLocalSyncCardProps {
  localPath: string;
  onLocalPathChange: (path: string) => void;
  onStartUpload: () => void;
  localUploading: boolean;
}

export function CinemaLocalSyncCard({
  localPath,
  onLocalPathChange,
  onStartUpload,
  localUploading,
}: CinemaLocalSyncCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FolderSync size={18} className="text-primary" />
          Đồng bộ Local
        </CardTitle>
        <CardDescription className="text-xs">
          Nhập folder server để upload tự động.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="E:\Movies\New"
          value={localPath}
          onChange={(e) => onLocalPathChange(e.target.value)}
          className="bg-background/50 h-9"
        />
        <Button
          className="w-full h-9"
          onClick={onStartUpload}
          disabled={localUploading}
        >
          {localUploading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FolderSync className="mr-2 h-4 w-4" />
          )}
          {localUploading ? "Đang Sync..." : "Bắt đầu Sync"}
        </Button>
      </CardContent>
    </Card>
  );
}
