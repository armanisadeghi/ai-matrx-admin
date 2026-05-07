/**
 * features/agents/hooks/useAiImageUrl.ts
 *
 * Smart URL manager for AI-generated image URLs (S3 presigned).
 *
 * Problems solved:
 *  1. Pre-detection of expiry — parses X-Amz-Date + X-Amz-Expires from the
 *     query string and schedules an auto-refresh BEFORE the URL goes dead.
 *  2. Error recovery — <img onError> triggers a refresh attempt so a component
 *     that happens to render after expiry never stays broken.
 *  3. No duplicate API calls — a module-level cache keyed on the S3 path
 *     (without query params) ensures that when the inline block AND the peek
 *     notification both try to refresh at the same time, only ONE
 *     getSignedUrl() call is made; both components get the same new URL.
 *
 * Refresh path:
 *   Extract the UUID from the S3 path → call Files.getSignedUrl(fileId).
 *   The UUID is the cloud_files record ID (ai-media files are registered
 *   in cloud_files on upload).  If extraction fails the hook surfaces the
 *   error and leaves the image showing its last-known URL.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Files from "@/features/files/api/files";
import { extractErrorMessage } from "@/utils/errors";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Refresh 90s before the URL actually expires to avoid any race. */
const SAFETY_MARGIN_MS = 90 * 1_000;

// ─── Module-level URL cache ───────────────────────────────────────────────────
//
// Key: S3 path without query string  (e.g. "/userId/ai-media/uuid.jpg")
// Value: the currently-valid refreshed URL + its expiry + an in-flight promise
//        that resolves to the next URL (so concurrent callers piggyback).
//
// This cache intentionally lives outside React so it survives re-renders and
// is shared across every component that holds the same original image URL.

interface CacheEntry {
  url: string;
  expiresAt: number;
  /** Non-null only while a getSignedUrl() call is in-flight. */
  refreshPromise: Promise<string> | null;
}

const urlRefreshCache = new Map<string, CacheEntry>();

// ─── URL utilities ────────────────────────────────────────────────────────────

/** S3 path without query string — the stable dedup key. */
function pathKey(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Parse when a presigned S3 URL expires.
 * Returns Infinity for non-presigned URLs (no expiry).
 */
function parseS3ExpiresAt(url: string): number {
  try {
    const u = new URL(url);
    const dateStr = u.searchParams.get("X-Amz-Date"); // "20260507T131718Z"
    const expiresStr = u.searchParams.get("X-Amz-Expires"); // "604800"
    if (!dateStr || !expiresStr) return Infinity;

    // YYYYMMDDTHHMMSSZ → UTC timestamp
    const yr = parseInt(dateStr.slice(0, 4), 10);
    const mo = parseInt(dateStr.slice(4, 6), 10) - 1;
    const dy = parseInt(dateStr.slice(6, 8), 10);
    const hr = parseInt(dateStr.slice(9, 11), 10);
    const mn = parseInt(dateStr.slice(11, 13), 10);
    const sc = parseInt(dateStr.slice(13, 15), 10);
    const issuedAt = Date.UTC(yr, mo, dy, hr, mn, sc);
    return issuedAt + parseInt(expiresStr, 10) * 1_000;
  } catch {
    return Infinity;
  }
}

/** Returns true when the URL has already expired (or is within the safety margin). */
export function isAiImageUrlExpired(url: string): boolean {
  const expiresAt = parseS3ExpiresAt(url);
  return expiresAt !== Infinity && Date.now() >= expiresAt - SAFETY_MARGIN_MS;
}

/**
 * Extract the cloud_files UUID from an S3 path.
 * Path pattern: /{userId}/{folder}/{uuid}.{ext}
 * Exported so consumers can extract the fileId for other API calls (e.g. patchFile).
 */
export function extractFileId(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const lastSeg = parts[parts.length - 1] ?? "";
    const uuid = lastSeg.replace(/\.[^.]+$/, ""); // strip extension
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRe.test(uuid) ? uuid : null;
  } catch {
    return null;
  }
}

// ─── Core refresh logic (outside React) ──────────────────────────────────────

/**
 * Request a fresh signed URL for the given file.
 * Concurrent calls for the same path piggyback on the same in-flight request.
 */
async function refreshSignedUrl(originalUrl: string): Promise<string> {
  const key = pathKey(originalUrl);
  const cached = urlRefreshCache.get(key);

  // Piggyback on an in-flight refresh
  if (cached?.refreshPromise) return cached.refreshPromise;

  const fileId = extractFileId(originalUrl);
  if (!fileId) {
    throw new Error(
      `useAiImageUrl: cannot refresh — no UUID found in path "${pathKey(originalUrl)}"`,
    );
  }

  const promise: Promise<string> = Files.getSignedUrl(fileId, {
    expiresIn: 3_600,
  }).then(({ data }) => {
    const newEntry: CacheEntry = {
      url: data.url,
      expiresAt: Date.now() + data.expires_in * 1_000,
      refreshPromise: null,
    };
    urlRefreshCache.set(key, newEntry);
    return data.url;
  });

  // Record the pending promise (keep previous url so the img isn't blank)
  urlRefreshCache.set(key, {
    url: cached?.url ?? originalUrl,
    expiresAt: cached?.expiresAt ?? parseS3ExpiresAt(originalUrl),
    refreshPromise: promise,
  });

  return promise;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAiImageUrlResult {
  /** The current (possibly refreshed) URL — put this in <img src>. */
  url: string;
  /** True while a getSignedUrl() refresh call is in-flight. */
  loading: boolean;
  /** Error message if the last refresh attempt failed. */
  error: string | null;
  /**
   * Pass this to <img onError>.
   * When the browser fails to load the image (e.g. expired URL), the hook
   * immediately attempts to fetch a fresh URL.
   */
  onImageError: () => void;
  /** Imperatively trigger a refresh (exposed for a retry button). */
  refresh: () => void;
}

export function useAiImageUrl(initialUrl: string): UseAiImageUrlResult {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    // Start with the cached URL if we already refreshed this path
    const cached = urlRefreshCache.get(pathKey(initialUrl));
    return cached?.url ?? initialUrl;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref so the timer callback always sees the current initialUrl
  const initialUrlRef = useRef(initialUrl);
  initialUrlRef.current = initialUrl;

  const doRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newUrl = await refreshSignedUrl(initialUrlRef.current);
      setResolvedUrl(newUrl);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []); // stable — all mutable data accessed via refs or module cache

  const scheduleRefresh = useCallback(
    (expiresAt: number) => {
      const msUntilRefresh = expiresAt - Date.now() - SAFETY_MARGIN_MS;
      if (timerRef.current) clearTimeout(timerRef.current);

      if (msUntilRefresh <= 0) {
        // Already expired (or within margin) — refresh immediately
        void doRefresh();
        return;
      }

      timerRef.current = setTimeout(() => {
        void doRefresh();
      }, msUntilRefresh);
    },
    [doRefresh],
  );

  // On mount / initialUrl change: check expiry and wire up the timer
  useEffect(() => {
    const expiresAt = parseS3ExpiresAt(initialUrl);
    if (expiresAt !== Infinity) {
      scheduleRefresh(expiresAt);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [initialUrl, scheduleRefresh]);

  // After a successful refresh, reschedule for the *new* URL's expiry
  useEffect(() => {
    if (resolvedUrl === initialUrl) return; // still on original URL
    const expiresAt = parseS3ExpiresAt(resolvedUrl);
    if (expiresAt !== Infinity) scheduleRefresh(expiresAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUrl]);

  const onImageError = useCallback(() => {
    // Don't spam refreshes if one is already loading
    if (!loading) void doRefresh();
  }, [loading, doRefresh]);

  return {
    url: resolvedUrl,
    loading,
    error,
    onImageError,
    refresh: () => void doRefresh(),
  };
}
