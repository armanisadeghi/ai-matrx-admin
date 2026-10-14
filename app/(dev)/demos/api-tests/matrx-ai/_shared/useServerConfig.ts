"use client";

import { useState, useEffect, useCallback } from "react";
import { requestRaw } from "@/lib/python-client";
import { peekSelectedOrganizationId } from "@/lib/api/organization-admission";
import {
  SERVER_PRESETS,
  STORAGE_KEY_SERVER,
  STORAGE_KEY_TOKEN,
  DEFAULT_SERVER_URL,
} from "./servers";

export type HealthStatus = "idle" | "checking" | "ok" | "error";

export interface UseServerConfigReturn {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  authToken: string;
  setAuthToken: (token: string) => void;
  clearAuthToken: () => void;
  healthStatus: HealthStatus;
  healthDetail: string | null;
  checkHealth: () => Promise<void>;
  isPreset: boolean;
  authHeaders: Record<string, string>;
}

/**
 * Standalone hook for managing matrx-ai test server config.
 * Uses localStorage — zero Redux, zero useAdminOverride dependencies.
 * Shared across all matrx-ai demo pages.
 */
export function useServerConfig(): UseServerConfigReturn {
  const [serverUrl, setServerUrlState] = useState<string>(DEFAULT_SERVER_URL);
  const [authToken, setAuthTokenState] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("idle");
  const [healthDetail, setHealthDetail] = useState<string | null>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const storedServer = localStorage.getItem(STORAGE_KEY_SERVER);
      if (storedServer) setServerUrlState(storedServer);
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (storedToken) setAuthTokenState(storedToken);
    } catch {
      // localStorage unavailable (e.g. private browsing with strict settings)
    }
  }, []);

  const setServerUrl = useCallback((url: string) => {
    setServerUrlState(url);
    setHealthStatus("idle");
    setHealthDetail(null);
    try {
      localStorage.setItem(STORAGE_KEY_SERVER, url);
    } catch {
      /* ignore */
    }
  }, []);

  const setAuthToken = useCallback((token: string) => {
    setAuthTokenState(token);
    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } catch {
      /* ignore */
    }
  }, []);

  const clearAuthToken = useCallback(() => {
    setAuthTokenState("");
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch {
      /* ignore */
    }
  }, []);

  const checkHealth = useCallback(async () => {
    if (!serverUrl) return;
    setHealthStatus("checking");
    setHealthDetail(null);
    try {
      // The probe's purpose is "is THIS server up": the origin under test
      // rides as `baseUrlOverride`; any HTTP status is shown, not thrown.
      const res = await requestRaw(
        "/health",
        { method: "GET" },
        {
          baseUrlOverride: serverUrl,
          allowHttpError: true,
          expectedErrorStatuses: Array.from({ length: 200 }, (_, i) => 400 + i),
          signal: AbortSignal.timeout(6000),
        },
      );
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setHealthStatus("ok");
        const version = data?.version ? `v${data.version}` : null;
        const env = data?.environment ?? null;
        setHealthDetail(
          [version, env].filter(Boolean).join(" · ") || "Healthy",
        );
      } else {
        setHealthStatus("error");
        setHealthDetail(`HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      setHealthStatus("error");
      setHealthDetail(err instanceof Error ? err.message : "Connection failed");
    }
  }, [serverUrl]);

  const isPreset = SERVER_PRESETS.some((p) => p.url === serverUrl);

  // Organization admission rides with the JWT: the backend's AuthMiddleware
  // (matrx-connect, 2026-08-30) refuses org-less Bearer requests with 400
  // organization_required. The selected organization is peeked from the app
  // store (never a first/personal fallback); when none is selected the header
  // is omitted and the demo shows the server's own refusal on screen — the
  // point of a diagnostic surface. Guests (no token) send neither header.
  const organizationId = peekSelectedOrganizationId();
  const authHeaders: Record<string, string> = authToken
    ? {
        Authorization: `Bearer ${authToken}`,
        ...(organizationId ? { "X-Organization-Id": organizationId } : {}),
      }
    : {};

  return {
    serverUrl,
    setServerUrl,
    authToken,
    setAuthToken,
    clearAuthToken,
    healthStatus,
    healthDetail,
    checkHealth,
    isPreset,
    authHeaders,
  };
}
