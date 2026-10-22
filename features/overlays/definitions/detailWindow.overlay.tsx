"use client";

/**
 * Opener for the `detailWindow` overlay — the Detail primitive's WINDOW
 * presentation (`lib/detail`). Prefer `useOpenDetail()` from `lib/detail`,
 * which honors the person's presentation setting; this opener is the raw
 * window door the host binds behind it.
 *
 * - `useOpenDetailWindow()` — imperative hook; returns a handle with `close()`.
 * - `<DetailWindowController />` — declarative wrapper. Mount to open, unmount to close.
 *
 * Singleton: opening another record retargets the same window (Notion peek).
 */

import { useCallback } from "react";
import { dispatchThunk, useAppDispatch } from "@/lib/redux/hooks";
import type { DetailInstanceData } from "@ai-matrx/detail";
import { openDetailSingleton } from "@/features/window-panels/detail/openDetailSingleton";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "detailWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export type OpenDetailWindowOptions = DetailInstanceData;

export interface DetailWindowHandle {
  close: () => void;
}

export function useOpenDetailWindow() {
  const dispatch = useAppDispatch();
  // 🚨 D8 — THE ANNOUNCEMENT IS NOT THIS HOOK'S JOB. Every open of this
  // singleton goes through `openDetailSingleton`, which reads the record it is
  // about to replace and names it. Round 1 put that logic in this hook and its
  // sibling, and the `?panels=` hydrator — a third opener nobody remembered —
  // replaced records in silence (VERIFY-U-P1-R2). One primitive, no exceptions.
  const open = useCallback(
    (opts: OpenDetailWindowOptions, announce = true): DetailWindowHandle => {
      dispatchThunk(
        dispatch,
        openDetailSingleton({ data: opts, announce }),
      );
      return {
        close: () => dispatch(opener.close()),
      };
    },
    [dispatch],
  );
  return open;
}

/** Close the singleton from anywhere (the host's `close` port). */
export function useCloseDetailWindow() {
  const dispatch = useAppDispatch();
  return useCallback(() => {
    dispatch(opener.close());
  }, [dispatch]);
}

/** Declarative form. Renders nothing visible; opens on mount, closes on unmount. */
export const DetailWindowController = hookController<OpenDetailWindowOptions>(useOpenDetailWindow);

export type DetailWindowDefinitionData = OpenDetailWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    detailWindow: OverlayWire<DetailWindowDefinitionData>;
  }
}
