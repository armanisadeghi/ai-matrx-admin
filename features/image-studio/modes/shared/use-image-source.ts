"use client";

import { useEffect, useState } from "react";
import type { ImageSource } from "./types";
import { useMediaSrc } from "@ai-matrx/media/core";
import { fileIdFromFileEndpointUrl } from "@ai-matrx/media/files/engine/media/our-file-sources";

/**
 * Resolve an `ImageSource` to a single, browser-loadable URL plus a
 * suggested filename. Manages object-URL lifecycle for `file` sources.
 *
 * A `cloudFileId` source — and a `url` source that is one of OUR file byte
 * endpoints, which is the same identity in disguise — loads through
 * `useMediaSrc` with `crossOrigin`: private pixels arrive as a bearer-fetched
 * object URL, so `new Image()`, canvas reads, the cropper and `fetch` all
 * work and never taint the canvas. Binding `resolution.src` here handed
 * every mode an authenticated route it could not load (2026-10-22). A
 * foreign `url` source passes through untouched.
 */
export function useImageSource(source: ImageSource | null): {
  url: string | null;
  filename: string;
  ready: boolean;
  /**
   * Why a `cloudFileId` source could not be resolved (access denied, not
   * found, deleted…), or null. A mode shows this failure — never "No image
   * loaded" over a resolve that refused (RC-B12 round 12).
   */
  error: Error | null;
} {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const ownFileId =
    source?.kind === "cloudFileId"
      ? source.cloudFileId
      : source?.kind === "url"
        ? fileIdFromFileEndpointUrl(source.url)
        : null;
  const cloud = useMediaSrc(ownFileId ? { file_id: ownFileId } : null, {
    crossOrigin: true,
  });
  const cloudFileUrl = cloud.failed ? null : cloud.src;
  const error =
    ownFileId && cloud.failed
      ? new Error(
          `This image could not be opened (${(cloud.failureReason ?? "unknown").replace(/[_-]/g, " ")}).`,
        )
      : null;

  useEffect(() => {
    if (source?.kind !== "file") return undefined;
    let active = true;
    const nextObjectUrl = URL.createObjectURL(source.file);
    // Object URL creation synchronizes with a browser resource. Publish it
    // after the effect body so React never receives a synchronous effect write.
    queueMicrotask(() => {
      if (active) setObjectUrl(nextObjectUrl);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(nextObjectUrl);
    };
  }, [source]);

  const filename =
    source?.kind === "file"
      ? source.file.name
      : source?.kind === "url"
        ? (source.suggestedFilename ?? deriveFilenameFromUrl(source.url))
        : (source?.suggestedFilename ?? "image");

  const resolvedUrl =
    source?.kind === "file"
      ? objectUrl
      : ownFileId
        ? cloudFileUrl
        : source?.kind === "url"
          ? source.url
          : null;

  return {
    url: resolvedUrl,
    filename,
    ready: resolvedUrl !== null,
    error,
  };
}

function deriveFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url, "http://x");
    const last = u.pathname.split("/").pop() ?? "image";
    return last.includes(".") ? last : `${last}.png`;
  } catch {
    return "image.png";
  }
}
