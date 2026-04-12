/**
 * useBackendApi — Thin React hook wrapper for backend API calls.
 *
 * Reads the active backend URL from apiConfigSlice (single source of truth).
 * Supports all server environments: production, development, staging,
 * localhost, gpu, and custom.
 *
 * Prefer dispatching callApi() thunks directly for most cases — this hook
 * is for components in public routes that make direct fetch calls.
 *
 * Usage:
 * ```typescript
 * const api = useBackendApi();
 * const response = await api.post('/ai/agents/{id}', body);
 * ```
 */

import { useCallback, useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useApiAuth } from "./useApiAuth";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";

export function useBackendApi() {
  const { getHeaders, waitForAuth } = useApiAuth();
  const backendUrl = useAppSelector(selectResolvedBaseUrl);

  const getApiHeaders = useCallback(
    (includeContentType = true) => {
      const authHeaders = getHeaders();
      if (!includeContentType) {
        const { "Content-Type": _removed, ...rest } = authHeaders;
        return rest;
      }
      return {
        "Content-Type": "application/json",
        ...authHeaders,
      };
    },
    [getHeaders],
  );

  const post = useCallback(
    async (endpoint: string, body: unknown, signal?: AbortSignal) => {
      await waitForAuth();
      const url = `${backendUrl}${endpoint}`;
      const response = await fetch(url, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(
          `HTTP ${response.status}: ${errorData.detail || errorData.message || "Unknown error"}`,
        );
      }

      return response;
    },
    [backendUrl, getApiHeaders, waitForAuth],
  );

  const get = useCallback(
    async (endpoint: string, signal?: AbortSignal) => {
      await waitForAuth();
      const url = `${backendUrl}${endpoint}`;
      const response = await fetch(url, {
        method: "GET",
        headers: getApiHeaders(),
        signal,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(
          `HTTP ${response.status}: ${errorData.detail || errorData.message || "Unknown error"}`,
        );
      }

      return response;
    },
    [backendUrl, getApiHeaders, waitForAuth],
  );

  const upload = useCallback(
    async (endpoint: string, formData: FormData, signal?: AbortSignal) => {
      await waitForAuth();
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        headers: getApiHeaders(false),
        body: formData,
        signal,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(
          `HTTP ${response.status}: ${errorData.detail || errorData.message || "Unknown error"}`,
        );
      }

      return response;
    },
    [backendUrl, getApiHeaders, waitForAuth],
  );

  const customFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      await waitForAuth();
      return fetch(`${backendUrl}${endpoint}`, {
        ...options,
        headers: {
          ...getApiHeaders(),
          ...options.headers,
        },
      });
    },
    [backendUrl, getApiHeaders, waitForAuth],
  );

  return useMemo(
    () => ({
      backendUrl,
      getHeaders: getApiHeaders,
      waitForAuth,
      post,
      get,
      upload,
      fetch: customFetch,
    }),
    [backendUrl, getApiHeaders, waitForAuth, post, get, upload, customFetch],
  );
}
