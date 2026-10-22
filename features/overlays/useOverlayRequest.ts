"use client";

/**
 * The answering half of `requestOverlay` (./requestOverlay): an awaitable overlay's render module reads the
 * pending request from its open data and answers it. Render modules load lazily, so importing
 * `@ai-matrx/summon/handles` here costs no first-load bytes.
 *
 * `request` is null when the open data names no live request (e.g. a stale reopen) — the body renders
 * nothing and the overlay closes itself, so a dialog never shows without someone awaiting it.
 */
import { useEffect } from "react";
import { getRequest } from "@ai-matrx/summon/handles";

export interface OverlayRequest<Req, Res> {
  request: Req | null;
  /** Answer (first answer wins) and close. */
  settle: (response: Res) => void;
}

export function useOverlayRequest<Req, Res>(data: unknown, close: () => void): OverlayRequest<Req, Res> {
  const requestId =
    data && typeof data === "object" && typeof (data as { requestId?: unknown }).requestId === "string"
      ? (data as { requestId: string }).requestId
      : null;
  const pending = requestId ? getRequest<Req, Res>(requestId) : undefined;
  const missing = !pending;
  useEffect(() => {
    if (missing) close();
  }, [missing, close]);
  return {
    request: pending?.request ?? null,
    settle: (response: Res) => {
      pending?.resolve(response);
      close();
    },
  };
}
