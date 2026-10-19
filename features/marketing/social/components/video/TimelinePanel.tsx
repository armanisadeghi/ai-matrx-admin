"use client";

/**
 * Socials → Videos → one project → Timeline: the package's timeline editor over the project head. Media files load
 * through the ONE media door (the same loadable URLs the preview uses); every gesture is one patch through the
 * project door the studio already owns (base version + its conflict handling), passed in as `onOps`.
 */

import { useCallback, useMemo } from "react";

import type { Composition, PatchOp } from "@ai-matrx/media/video";
import { useMediaClient } from "@ai-matrx/media/core";
import { TimelineEditor } from "@ai-matrx/media/video/react";
import { EmptyState } from "@ai-matrx/design-system/controls";
import { Film } from "lucide-react";

import { useFileUrls } from "../../video/studio-hooks";
import { mediaFileIds } from "./StudioParts";

export function TimelinePanel({ doc, disabled, onOps }: { doc: Composition; disabled: boolean; onOps: (ops: PatchOp[], note: string) => Promise<boolean> }) {
  const mediaClient = useMediaClient();
  const byMedia = mediaFileIds(doc);
  const { facts, pending, failed } = useFileUrls(Object.values(byMedia));
  const key = Object.entries(byMedia)
    .map(([m, f]) => `${m}=${facts[f]?.url ?? ""}`)
    .join("|");
  // One stable map per set of loaded URLs: the player rebuilds its program only when a URL really changes.
  const mediaUrls = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [mid, fid] of Object.entries(byMedia)) {
      const url = facts[fid]?.url;
      if (url) out[mid] = url;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const readMediaBytes = useCallback(async (mediaId: string): Promise<ArrayBuffer | null> => {
    const source = doc.media[mediaId]?.source;
    if (source?.type !== "file" || !source.fileId) return null;
    const handle = await mediaClient.getBlob({ file_id: source.fileId });
    try {
      return await handle.blob.arrayBuffer();
    } finally {
      handle.release();
    }
  }, [doc, mediaClient]);
  if (pending) return <div className="h-[32rem] animate-pulse rounded-lg bg-muted" aria-label="Loading timeline" />;
  if (failed.length > 0) {
    return <EmptyState icon={<Film />} title="Files unavailable" line={`${failed.length} files didn't load`} />;
  }
  return <TimelineEditor doc={doc} mediaUrls={mediaUrls} onPatch={onOps} readMediaBytes={readMediaBytes} readAudio={readMediaBytes} disabled={disabled} />;
}
