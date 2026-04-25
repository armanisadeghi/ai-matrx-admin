/**
 * features/files/hooks/useSignedUrl.ts
 *
 * Fetch + cache + expiry-aware refresh for S3 presigned URLs.
 *
 * Why this is non-trivial: the URL is time-boxed. If we cache it as-is and
 * re-render 30 minutes later, it might be dead. This hook stores the URL +
 * an expiry timestamp and auto-refreshes before it expires.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Files from "../api/files";

const SAFETY_MARGIN_MS = 30 * 1000; // refresh 30s before expiry

export interface UseSignedUrlOptions {
  /**
   * Seconds the URL should be valid for. Defaults to 1 hour (3600).
   * Bounded server-side to [60, 604800].
   */
  expiresIn?: number;
  /**
   * If false, the hook won't fetch — useful when the host component isn't
   * visible yet (e.g., inside a collapsed tab).
   */
  enabled?: boolean;
}

export interface UseSignedUrlResult {
  url: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSignedUrl(
  fileId: string | null | undefined,
  options: UseSignedUrlOptions = {},
): UseSignedUrlResult {
  const { expiresIn = 3600, enabled = true } = options;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiresAtRef = useRef<number>(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUrl = useCallback(async () => {
    if (!fileId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await Files.getSignedUrl(fileId, { expiresIn });
      setUrl(data.url);
      expiresAtRef.current = Date.now() + data.expires_in * 1000;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setUrl(null);
    } finally {
      setLoading(false);
    }
  }, [fileId, enabled, expiresIn]);

  useEffect(() => {
    if (!fileId || !enabled) {
      setUrl(null);
      return;
    }
    void fetchUrl();
  }, [fileId, enabled, fetchUrl]);

  // Auto-refresh before expiry.
  useEffect(() => {
    if (!url) return;
    const msUntilExpiry = expiresAtRef.current - Date.now() - SAFETY_MARGIN_MS;
    if (msUntilExpiry <= 0) {
      void fetchUrl();
      return;
    }
    refreshTimerRef.current = setTimeout(() => {
      void fetchUrl();
    }, msUntilExpiry);
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [url, fetchUrl]);

  return { url, loading, error, refresh: fetchUrl };
}
