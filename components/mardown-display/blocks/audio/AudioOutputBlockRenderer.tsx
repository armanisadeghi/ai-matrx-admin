"use client";

/**
 * components/mardown-display/blocks/audio/AudioOutputBlockRenderer.tsx
 *
 * The audio twin of `UnifiedImageBlockRenderer`. `BlockRenderer` hands us the
 * raw `audio_output` / `media_block(kind=audio)` `serverData` and we resolve a
 * DURABLE, playable URL through the universal file handler (`useFileSrc`)
 * before mounting the presentational `<AudioOutputBlock>` player.
 *
 * URL resolution is shared with the video renderer via `buildMediaSource`.
 * See that file (and FOUND_DEFECTS.md → "Media durability") for the rationale:
 * the old path echoed the raw `data.url`, which (a) didn't play during
 * streaming — Python sends only a `file_id`, no minted URL — and (b) leaked a
 * raw signed S3 URL through "Copy link".
 */

import React, { useEffect } from "react";
import AudioOutputBlock from "./AudioOutputBlock";
import SpeechScriptPanel, { readPerformedScript } from "./SpeechScriptPanel";
import { useMediaResolution } from "@ai-matrx/media/core";
import { fileSourceToMediaRef } from "@ai-matrx/rich-content/utils/media-refs";
import { buildMediaSource, pickStr } from "@ai-matrx/rich-content/display/blocks/buildMediaSource";
import { classifyMediaUrl } from "@/lib/media/durability";

export interface AudioOutputBlockRendererProps {
  /** The block's `serverData` — legacy `audio_output` or `media_block(audio)`. */
  data: Record<string, unknown>;
  title?: string;
}

const AudioOutputBlockRenderer: React.FC<AudioOutputBlockRendererProps> = ({
  data,
  title,
}) => {
  const mime = pickStr(data.mimeType) ?? pickStr(data.mime_type);
  const source = buildMediaSource(data, mime);
  const resolvedUrl =
    // media-src-ok: <audio> element — files-session cookie lane
    useMediaResolution(fileSourceToMediaRef(source)).resolution?.src ?? null;

  // Log the raw inbound shape + what we resolved, once per resolved URL. This is
  // a plain `console.log` (NOT `console.error`) on purpose: a still-expiring S3
  // URL here means the AUDIO was persisted private server-side — a known defect
  // (FOUND_DEFECTS.md → "Media durability"). The proper fix is backend (serve a
  // durable public / our-domain URL); an error overlay on every generation for
  // a tracked backend gap is just noise.
  useEffect(() => {
    if (!resolvedUrl) return;
    console.log("[audio-block] resolved", {
      kind: classifyMediaUrl(resolvedUrl),
      resolvedUrl,
      rawData: data,
    });
  }, [resolvedUrl, data]);

  if (!resolvedUrl) return null;

  // Chat's live TTS hand-over: the saved file starts where the live player was.
  const startAt = readLiveHandoff(data);

  // A speech-script run carries the performed script: player + script, side
  // by side when there is room, stacked on a phone.
  const script = readPerformedScript(data);
  if (script) {
    return (
      <div className="grid gap-3 md:grid-cols-[minmax(0,22rem)_1fr] items-start">
        <AudioOutputBlock url={resolvedUrl} mimeType={mime} title={title} startAt={startAt} />
        <SpeechScriptPanel script={script} />
      </div>
    );
  }

  return <AudioOutputBlock url={resolvedUrl} mimeType={mime} title={title} startAt={startAt} />;
};

/** `live_handoff` as chat's process-stream stamps it on the saved-file block. */
function readLiveHandoff(data: Record<string, unknown>): { timeSec: number; resume: boolean } | null {
  const h = data.live_handoff as { timeSec?: unknown; resume?: unknown } | null | undefined;
  return h && typeof h.timeSec === "number" && Number.isFinite(h.timeSec)
    ? { timeSec: h.timeSec, resume: h.resume === true }
    : null;
}

export default AudioOutputBlockRenderer;
