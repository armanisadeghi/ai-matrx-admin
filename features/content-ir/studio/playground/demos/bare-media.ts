import type { PlaygroundDemo } from "../types";

/**
 * Bare media tags, written the way a careless author would: an `<img>` cropped to 4:5 with
 * object-cover, a `<video>` with a `<source>`, and a YouTube `<iframe>`. The compiler converts each
 * to its kit piece (KindImage / KindVideo / KindEmbed), so all three show whole in the page and the frame.
 */
const source = String.raw`import React from "react";
import { ImageIcon } from "lucide-react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";

export default function BareMedia({ data, runAction }) {
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar title={data?.title || "Bare media"} icon={ImageIcon} subtitle="Plain img, video and iframe tags" />
      <KindPanelGrid minColumnWidth={320} gap="sm">
        <KindPanel title="Photo">
          <img src={data?.photo_url} alt={data?.photo_alt || ""} className="w-full aspect-[4/5] object-cover rounded-md" />
        </KindPanel>
        <KindPanel title="Video">
          <video controls className="w-full h-48 object-cover">
            <source src={data?.video_url} type="video/mp4" />
          </video>
        </KindPanel>
        <KindPanel title="Embed">
          <iframe src={data?.embed_url} width="560" height="315" title={data?.embed_title || "Video"} allowFullScreen />
        </KindPanel>
      </KindPanelGrid>
    </div>
  );
}
`;

export const BARE_MEDIA_DEMO: PlaygroundDemo = {
  slug: "playground_bare_media",
  title: "Bare media tags",
  covers: ["Bare img", "Bare video", "Bare iframe"],
  source,
  sample: {
    title: "Bare media",
    photo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/960px-Tour_Eiffel_Wikimedia_Commons.jpg",
    photo_alt: "Eiffel Tower",
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    embed_url: "https://www.youtube.com/embed/jNQXAC9IVRw",
    embed_title: "First video on YouTube",
  },
};
