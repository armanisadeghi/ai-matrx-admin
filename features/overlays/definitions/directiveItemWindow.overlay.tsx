"use client";

/**
 * Opener for the `directiveItemWindow` overlay — read ONE item of a pending
 * directive properly before approving the write it proposes.
 *
 * Multi-instance by design: a directive can carry several items, and comparing
 * two of them (what exactly differs between these three pages I'm about to
 * create?) is the normal reason to open one at all — so a second item opens a
 * second window rather than replacing the first.
 *
 * See `features/window-panels/windows/directive-item/DirectiveItemWindow.tsx`.
 */

import { useCallback } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay, mintInstanceId } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "directiveItemWindow" as const;

export interface OpenDirectiveItemWindowOptions {
  /** The item. Travels through Redux, so it must be serializable. */
  item: Record<string, unknown>;
  /** The content-IR kind this item IS, or null when the shape has none. */
  itemKind?: string | null;
  /** What the item is called — the same title the card shows. */
  title: string;
  /** "Create Agent Definition · item 1 of 1". */
  subtitle?: string | null;
  /** Stable id when re-opening the SAME item should reuse its window. */
  instanceId?: string;
}

export interface DirectiveItemWindowHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenDirectiveItemWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenDirectiveItemWindowOptions): DirectiveItemWindowHandle => {
      const instanceId =
        opts.instanceId ??
        mintInstanceId(OVERLAY_ID);
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            windowInstanceId: instanceId,
            item: opts.item,
            itemKind: opts.itemKind ?? null,
            title: opts.title,
            subtitle: opts.subtitle ?? null,
          },
        }),
      );
      return {
        instanceId,
        close: () =>
          dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
      };
    },
    [dispatch],
  );
}

export type DirectiveItemWindowDefinitionData = OpenDirectiveItemWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    directiveItemWindow: OverlayWire<DirectiveItemWindowDefinitionData>;
  }
}
