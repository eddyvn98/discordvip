import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CinemaChannel, CinemaScanJob } from "../cinema.types";
import { CinemaChannelListItem } from "./CinemaChannelListItem";

interface CinemaChannelListProps {
  channels: CinemaChannel[];
  latestJobByChannel: Map<string, CinemaScanJob>;
  selectedChannelId: string | null;
  onSelect: (id: string) => void;
}

export function CinemaChannelList({
  channels,
  latestJobByChannel,
  selectedChannelId,
  onSelect,
}: CinemaChannelListProps) {
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base font-semibold">Kênh nguồn</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {channels.map((channel) => (
          <CinemaChannelListItem
            key={channel.id}
            channel={channel}
            job={latestJobByChannel.get(channel.id)}
            isSelected={selectedChannelId === channel.id}
            onSelect={onSelect}
          />
        ))}
      </CardContent>
    </Card>
  );
}
