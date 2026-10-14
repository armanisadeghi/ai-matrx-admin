/**
 * useBackendApi — Thin React hook wrapper for backend API calls.
 *
 * Resolves the requested service URL from apiConfigSlice (single source of
 * truth). Defaults to aidream and can target independently configured services
 * such as the standalone scraper in every supported environment.
 *
 * Legacy response-shaped adapter. Calls are transported by
 * lib/python-client::requestRaw so auth, request IDs, structured errors, and
 * Error Inspector capture remain centralized. New feature code uses the
 * contract-bound typed client or callApi; the boundary audit tracks every
 * remaining consumer of this hook.
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
import { selectResolvedServiceBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { requestRaw } from "@/lib/python-client";
import { serviceRequestBase, type ApiService } from "@/lib/api/service-routing";

interface BackendRequestPolicy {
  /** Expected HTTP outcomes that must not enter the repair queue. */
  expectedErrorStatuses?: readonly number[];
}

export function useBackendApi(service: ApiService = "aidream") {
  const { getHeaders, waitForAuth } = useApiAuth();
  const backendUrl = serviceRequestBase(
    service,
    useAppSelector((state) => selectResolvedServiceBaseUrl(state, service)),
  );

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
    async (
      endpoint: string,
      body: unknown,
      signal?: AbortSignal,
      policy?: BackendRequestPolicy,
    ) => {
      if (!backendUrl) {
        throw new Error(`No ${service} API URL is configured.`);
      }
      return requestRaw(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        },
        { baseUrlOverride: backendUrl, signal, ...policy },
      );
    },
    [backendUrl, service],
  );

  const get = useCallback(
    async (
      endpoint: string,
      signal?: AbortSignal,
      policy?: BackendRequestPolicy,
    ) => {
      if (!backendUrl) {
        throw new Error(`No ${service} API URL is configured.`);
      }
      return requestRaw(
        endpoint,
        {
          method: "GET",
          signal,
        },
        { baseUrlOverride: backendUrl, signal, ...policy },
      );
    },
    [backendUrl, service],
  );

  const upload = useCallback(
    async (endpoint: string, formData: FormData, signal?: AbortSignal) => {
      if (!backendUrl) {
        throw new Error(`No ${service} API URL is configured.`);
      }
      return requestRaw(
        endpoint,
        {
          method: "POST",
          body: formData,
          signal,
        },
        { baseUrlOverride: backendUrl, signal },
      );
    },
    [backendUrl, service],
  );

  const customFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      if (!backendUrl) {
        throw new Error(`No ${service} API URL is configured.`);
      }
      return requestRaw(endpoint, options, {
        baseUrlOverride: backendUrl,
        signal: options.signal ?? undefined,
        allowHttpError: true,
      });
    },
    [backendUrl, service],
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
