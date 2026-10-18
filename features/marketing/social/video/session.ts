"use client";

/**
 * An expired sign-in in the video studio: the server answers 401 and every door goes quiet. The studio sends the person
 * to sign in (the page they are on is kept as the way back) instead of leaving silent failures.
 */

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BackendApiError } from "@ai-matrx/api";

import { useLoginHref } from "@/hooks/auth/useLoginHref";

/** True when the error is the server saying the sign-in has run out (HTTP 401, or the client's own "sign in" refusal). */
export function isSessionExpired(error: unknown): boolean {
  if (error instanceof BackendApiError) return error.status === 401 || error.code === "auth_required";
  const e = error as { status?: unknown; code?: unknown } | null;
  return Boolean(e && typeof e === "object" && (e.status === 401 || e.code === "auth_required"));
}

/**
 * `guard(error)` sends the person to sign in when the error is an expired session and says so; every studio query that
 * answers 401 does the same without being asked. One redirect per page load.
 */
export function useExpiredSessionGuard(): (error: unknown) => boolean {
  const loginHref = useLoginHref();
  const queryClient = useQueryClient();
  const go = useCallback(() => {
    const w = window as unknown as { __videoSignInRedirect?: boolean };
    if (w.__videoSignInRedirect) return;
    w.__videoSignInRedirect = true;
    window.location.assign(loginHref);
  }, [loginHref]);
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error" && isSessionExpired(event.action.error)) go();
    });
  }, [queryClient, go]);
  return useCallback(
    (error: unknown) => {
      if (!isSessionExpired(error)) return false;
      go();
      return true;
    },
    [go],
  );
}
