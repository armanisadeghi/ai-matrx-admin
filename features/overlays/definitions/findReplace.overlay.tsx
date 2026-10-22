"use client";

/**
 * Opener for the `findReplace` overlay (the chat package's `FindReplaceWindow` in the
 * overlay layer).
 *
 * Callback-aware: the modal needs a LIVE DOM target and an `onReplace` handler,
 * neither of which can travel through Redux. The opener registers a callback
 * group (via `features/overlays/callbacks/findReplace`) and passes only the
 * resulting `callbackGroupId` string through `openOverlay` data — callers never
 * touch the registry. Mirrors `useOpenImageUploaderWindow`.
 *
 * - `useOpenFindReplace()` — imperative hook. Returns a handle with `close()`
 *   (closes the overlay AND disposes the callback group) and `dispose()` (drops
 *   the group without closing).
 * - `<FindReplaceController />` — declarative wrapper.
 *
 * THE OVERLAY OWNS THE GROUP'S LIFETIME, never the opener. The right-click menu opens this from
 * inside its own body, which unmounts the moment the menu closes — before the lazy overlay body
 * reads the group. Disposing on the opener's unmount left the find bar with no target ("No
 * results" over a composer holding three matches, 2026-10-21). The group now lives until the
 * overlay closes (its body's close disposes it) or the same slot is opened again.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@ai-matrx/summon/open";
import { createFindReplaceCallbackGroup, findReplaceGroupBySlot as groupBySlot } from "./callbacks/findReplace";

const slotKey = (instanceId?: string) => instanceId ?? "";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "findReplace" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenFindReplaceOptions {
  /** Accessor for the live textarea/input to search. Re-read at use time. */
  getTargetElement: () => HTMLTextAreaElement | HTMLInputElement | null;
  /** Optional. When present, replaces drive content through the caller. */
  onReplace?: (newText: string) => void;
  /** Optional stable instance id. Omit for the default singleton slot. */
  instanceId?: string;
}

export interface FindReplaceHandle {
  overlayId: string;
  callbackGroupId: string;
  /** Close the overlay AND dispose the callback group. */
  close: () => void;
  /** Leave the overlay open; dispose the callback group only. */
  dispose: () => void;
}

export function useOpenFindReplace() {
  const dispatch = useAppDispatch();

  return useCallback(
    (opts: OpenFindReplaceOptions): FindReplaceHandle => {
      const { callbackGroupId, dispose } = createFindReplaceCallbackGroup({
        getTargetElement: opts.getTargetElement,
        onReplace: opts.onReplace,
      });
      const key = slotKey(opts.instanceId);
      // The slot's previous group belongs to the find bar this one replaces.
      groupBySlot.get(key)?.dispose();
      groupBySlot.set(key, { callbackGroupId, dispose });

      opener.open(dispatch, { instanceId: opts.instanceId, data: { callbackGroupId } });

      const detach = () => {
        if (groupBySlot.get(key)?.callbackGroupId === callbackGroupId) groupBySlot.delete(key);
        dispose();
      };

      return {
        overlayId: OVERLAY_ID,
        callbackGroupId,
        close: () => {
          dispatch(opener.close(opts.instanceId));
          detach();
        },
        dispose: detach,
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount, closes
 * it on unmount. Callback identity changes do NOT re-open — the handlers feed
 * the underlying group; pass stable functions (or memoize) for predictable
 * behavior.
 */
export const FindReplaceController = hookController<OpenFindReplaceOptions>(useOpenFindReplace);

export type FindReplaceDefinitionData = OpenFindReplaceOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    findReplace: OverlayWire<FindReplaceDefinitionData>;
  }
}
