"use client";

/**
 * Images saved onto an item (`run_shortcut` with `expect: "image"`) are stored
 * by durable identity only — `{ file_id, mime_type, width, height }`. A file id
 * is not something a component can put in `<img src>`: the sandbox frame has an
 * opaque origin, `connect-src 'none'`, and no reliable cookie (third-party), so
 * the HOST fetches the bytes with the person's own authorization (the python
 * client's bearer lane, `downloadFile`) and hands them over:
 *
 *  - in-page render → `src` is a `blob:` URL created here;
 *  - sandbox frame  → `src` is the Blob itself (structured-clone over the
 *    port); the frame turns it into its own `blob:` URL (frame-bridge).
 *
 * A component therefore always renders `itemState.<key>.src` and never knows
 * which world it is in. A ref whose bytes failed to load carries `src: null`
 * and `src_error` with a sentence the component can show.
 */

import { useEffect, useState } from "react";
import { downloadFile } from "@/features/files/api/files";
import { rememberFileOrganization } from "@/features/files/api/fileOrganization";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";

import {
  isImageRef,
  MAX_IMAGE_REF_DEPTH as MAX_DEPTH,
  stableImageState,
  withImageSources,
  type ImageSources,
} from "@ai-matrx/rich-content/kinds/db-component/item-state-images";

export { stableImageState, withImageSources, type ImageSources };

type State = Record<string, unknown>;

/** Every image file id a state holds, in a stable order. */
export function imageFileIdsOf(state: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > MAX_DEPTH || !state || typeof state !== "object") return out;
  if (isImageRef(state)) {
    if (!out.includes(state.file_id)) out.push(state.file_id);
    // Byte reads name the file's own organization (never a guess).
    if (typeof state.organization_id === "string" && state.organization_id) {
      rememberFileOrganization(state.file_id, state.organization_id);
    }
    return out;
  }
  for (const value of Array.isArray(state) ? state : Object.values(state)) {
    imageFileIdsOf(value, depth + 1, out);
  }
  return out;
}

const cache = new Map<string, Promise<{ blob: Blob } | { error: string }>>();

function loadImage(fileId: string): Promise<{ blob: Blob } | { error: string }> {
  let pending = cache.get(fileId);
  if (!pending) {
    pending = downloadFile(fileId, { inline: true })
      .then(({ blob }) => ({ blob }))
      .catch((err: unknown) => {
        cache.delete(fileId);
        captureError({
          source: "content-ir",
          message: `[kind-item-state] could not load saved image ${fileId}`,
          raw: { fileId, error: err instanceof Error ? err.message : String(err) },
        });
        return { error: "This image couldn't be loaded." };
      });
    cache.set(fileId, pending);
  }
  return pending;
}

/** The loaded bytes for every image ref in `state`. */
export function useItemStateImages(state: State | null): ImageSources {
  const ids = imageFileIdsOf(state);
  const key = ids.join("|");
  const [sources, setSources] = useState<Map<string, { blob: Blob } | { error: string }>>(
    () => new Map(),
  );
  useEffect(() => {
    if (!key) return undefined;
    let live = true;
    for (const id of key.split("|")) {
      void loadImage(id).then((source) => {
        if (!live) return;
        setSources((prev) => {
          if (prev.get(id) === source) return prev;
          const next = new Map(prev);
          next.set(id, source);
          return next;
        });
      });
    }
    return () => {
      live = false;
    };
  }, [key]);
  return sources;
}
