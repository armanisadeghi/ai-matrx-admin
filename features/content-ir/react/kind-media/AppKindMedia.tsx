"use client";

/**
 * The app's `KindVideo`, `KindAudio` and `KindEmbed`: a shape's media rendered by the platform's
 * canonical players, never a second one. Registered as the kind kit's `Video` / `Audio` / `Embed`
 * host slots (lib/code-runtime/kind-kit-host.ts); the sandbox frame aliases this module to
 * sandbox/runtime/FrameKindMedia.tsx, whose frame-safe defaults ask the host through runAction.
 *
 *  - video  → `UnifiedVideoBlockRenderer` (expand, download, share, context menu), saved file or web URL;
 *  - audio  → `InlineMediaRef as="audio"` (the durable-handle player GeneratedAudioBlock uses);
 *  - embed  → YouTube through `YouTubeEmbed` (click-to-play facade, no cookies until played); Vimeo, Loom,
 *             Google Maps and Figma through their own embed address; any other link is an Open card.
 *
 * A ref with neither a file id nor an address falls back to the kit's default, which says nothing is there.
 */
import {
  DefaultKindAudio,
  DefaultKindEmbed,
  DefaultKindVideo,
  kindEmbedBoxStyle,
  kindVideoBoxStyle,
  parseEmbed,
  type KindAudioProps,
  type KindEmbedProps,
  type KindMediaRef,
  type KindVideoProps,
} from "@ai-matrx/content-ir/kind-kit";
import { InlineMediaRef } from "@ai-matrx/media/react";
import UnifiedVideoBlockRenderer from "@/features/files/blocks/video/UnifiedVideoBlockRenderer";
import { YouTubeEmbed } from "@/features/files/blocks/youtube/YouTubeEmbed";
import type { VideoBlock } from "@/features/files/blocks/types";
import { rememberFileOrganization } from "@/features/files/api/fileOrganization";

function asRef(value: KindMediaRef | string | null | undefined): KindMediaRef | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() ? { url: value.trim() } : null;
  return value;
}

const MAX_HEIGHT = 480;

export function AppKindVideo(props: KindVideoProps) {
  const ref = asRef(props.video);
  const fileId = ref?.file_id ? ref.file_id : null;
  const url = !fileId && ref?.url ? ref.url : null;
  if (!ref || (!fileId && !url)) return <DefaultKindVideo {...props} />;
  if (fileId && ref.organization_id) rememberFileOrganization(fileId, ref.organization_id);
  const maxHeight = props.maxHeight ?? MAX_HEIGHT;
  const base = {
    kind: "video",
    status: "complete",
    progress: null,
    errorMessage: null,
    mimeType: ref.mime_type ?? null,
    fileName: props.title?.trim() || null,
    sizeBytes: null,
    base64: null,
    metadata: null,
    width: ref.width ?? null,
    height: ref.height ?? null,
    durationMs: typeof ref.duration === "number" ? Math.round(ref.duration * 1000) : null,
    posterUrl: ref.poster ?? null,
  };
  const block = (
    fileId
      ? {
          ...base,
          origin: "matrx",
          fileId,
          visibility: "personal",
          cdnUrl: null,
          downloadUrl: null,
          parentFileId: null,
          derivationKind: null,
        }
      : { ...base, origin: "external", externalUrl: url, sourceLabel: null }
  ) as unknown as VideoBlock;
  return (
    <div className={props.className} style={kindVideoBoxStyle(ref, maxHeight)} data-kind-video="">
      <UnifiedVideoBlockRenderer block={block} />
    </div>
  );
}

export function AppKindAudio(props: KindAudioProps) {
  const ref = asRef(props.audio);
  const handle = ref?.file_id || ref?.url || null;
  if (!ref || !handle) return <DefaultKindAudio {...props} />;
  if (ref.file_id && ref.organization_id) rememberFileOrganization(ref.file_id, ref.organization_id);
  return (
    <div className={props.className} data-kind-audio="">
      {/* A HEIGHT, not chrome: `size="fill"` is h-full, and an auto-height parent paints a 0px player. */}
      <div className="h-[54px] w-full">
        <InlineMediaRef ref={handle} as="audio" size="fill" rounded="md" controls preload="metadata" alt={props.title ?? ""} />
      </div>
    </div>
  );
}

/** The provider's embed address without its autoplay flag — a page must not start playing on load. */
function withoutAutoplay(embedUrl: string): string {
  try {
    const u = new URL(embedUrl);
    u.searchParams.delete("autoplay");
    return u.href;
  } catch {
    return embedUrl;
  }
}

export function AppKindEmbed(props: KindEmbedProps) {
  const embed = parseEmbed(props.url);
  if (!embed.embedUrl) return <DefaultKindEmbed {...props} />;
  const maxHeight = props.maxHeight ?? MAX_HEIGHT;
  if (embed.provider === "youtube" && embed.videoId) {
    return (
      <div className={props.className} style={kindEmbedBoxStyle(embed.aspect, maxHeight)} data-kind-embed="" data-provider="youtube">
        <YouTubeEmbed videoId={embed.videoId} start={embed.start} title={props.title} />
      </div>
    );
  }
  return (
    <div
      className={props.className}
      style={kindEmbedBoxStyle(embed.aspect, maxHeight)}
      data-kind-embed=""
      data-provider={embed.provider}
    >
      <iframe
        src={withoutAutoplay(embed.embedUrl)}
        title={props.title?.trim() || embed.label}
        loading="lazy"
        allow="fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        className="h-full w-full rounded-md border border-border"
      />
    </div>
  );
}
