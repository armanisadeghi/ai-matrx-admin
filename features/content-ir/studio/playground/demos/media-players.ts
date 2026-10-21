import type { PlaygroundDemo } from "../types";

/** KindVideo, KindAudio, KindEmbed: web addresses, a saved file by id, provider embeds. */
const source = String.raw`import React from "react";
import { Film } from "lucide-react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { KindVideo } from "@/components/kind-kit/KindVideo";
import { KindAudio } from "@/components/kind-kit/KindAudio";
import { KindEmbed } from "@/components/kind-kit/KindEmbed";
import { StreamingSkeleton, useStreamingValue, streamList, streamText } from "@/components/kind-kit/StreamingSkeleton";

function SavedFile({ runAction }) {
  const [id, setId] = React.useState("");
  const fileId = id.trim();
  return (
    <div className="flex flex-col gap-2">
      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="Saved file id (a video or audio you uploaded)"
        aria-label="Saved file id"
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
      />
      {fileId ? (
        <>
          <KindVideo video={{ file_id: fileId, mime_type: "video/mp4" }} title="Saved video" runAction={runAction} maxHeight={320} />
          <KindAudio audio={{ file_id: fileId, mime_type: "audio/mpeg" }} title="Saved audio" runAction={runAction} />
        </>
      ) : null}
    </div>
  );
}

export default function MediaPlayers({ data, runAction }) {
  const { value: title, arrived } = useStreamingValue(data?.title, "");
  const embeds = streamList(data?.embeds).filter((e) => e && e.url);
  if (!arrived && embeds.length === 0) return <StreamingSkeleton layout="cards" rows={2} />;
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar title={title || "Media"} icon={Film} subtitle="Video, audio and embeds play from the platform's own players" />
      <KindPanelGrid minColumnWidth={320} gap="sm">
        <KindPanel title="Video">
          <KindVideo video={data?.video_url} title={streamText(data?.video_title, "Video")} runAction={runAction} maxHeight={320} />
        </KindPanel>
        <KindPanel title="Audio">
          <KindAudio audio={data?.audio_url} title={streamText(data?.audio_title, "Audio")} runAction={runAction} />
        </KindPanel>
        <KindPanel title="Saved file">
          <SavedFile runAction={runAction} />
        </KindPanel>
        {embeds.map((e, i) => (
          <KindPanel key={i} title={streamText(e.title, "Embed")}>
            <KindEmbed url={e.url} title={streamText(e.title, "")} runAction={runAction} maxHeight={320} />
          </KindPanel>
        ))}
      </KindPanelGrid>
    </div>
  );
}
`;

export const MEDIA_PLAYERS_DEMO: PlaygroundDemo = {
  slug: "playground_media_players",
  title: "Video, audio and embeds",
  covers: ["KindVideo", "KindAudio", "KindEmbed", "load_media", "play_embed"],
  source,
  sample: {
    title: "Launch media",
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    video_title: "Flower time-lapse",
    audio_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
    audio_title: "T-Rex roar",
    embeds: [
      { title: "First video on YouTube", url: "https://www.youtube.com/watch?v=jNQXAC9IVRw" },
      { title: "Vimeo staff pick", url: "https://vimeo.com/76979871" },
      { title: "Eiffel Tower", url: "https://www.google.com/maps/place/Eiffel+Tower" },
    ],
  },
};
