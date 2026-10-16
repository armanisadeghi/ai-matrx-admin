// features/files/cache/registerOnFirstFileFetch.ts
//
// The blob-cache Service Worker registers on the page's FIRST cloud-file byte fetch, never at idle
// (owner rule, 2026-10-16). The byte paths are the ones the worker itself serves
// (service-worker/src/sw.ts FILES_DOWNLOAD_RE / SHARE_DOWNLOAD_RE). A PerformanceObserver over
// resource timing sees every fetch/img/video request — including ones made before this module ran
// (`buffered: true`) — without touching the files engine. The first file renders from the network
// as it always has; later ones go through the worker.
"use client";

import { registerBlobCacheServiceWorker } from "@/features/files/cache/register-service-worker";

const FILE_BYTES_RE = /^\/(?:files\/[0-9a-f-]{36}|share\/[^/]+)\/download(?:\?|$)/i;

export function isFileBytesUrl(url: string): boolean {
  try {
    return FILE_BYTES_RE.test(new URL(url, "http://x").pathname);
  } catch {
    return false;
  }
}

/** Watches for the first file-bytes request; registers once. Returns a stop function. */
export function registerBlobCacheOnFirstFileFetch(args: {
  backendUrl: string;
  userId: string;
  register?: typeof registerBlobCacheServiceWorker;
}): () => void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return () => {};
  const register = args.register ?? registerBlobCacheServiceWorker;
  let done = false;
  const observer = new PerformanceObserver((list) => {
    if (done) return;
    if (!list.getEntries().some((entry) => isFileBytesUrl(entry.name))) return;
    done = true;
    observer.disconnect();
    void register({ backendUrl: args.backendUrl, userId: args.userId });
  });
  try {
    observer.observe({ type: "resource", buffered: true });
  } catch {
    return () => {};
  }
  return () => {
    done = true;
    observer.disconnect();
  };
}
