"use client";

/**
 * Opener for the `topicalMapTopicPanel` overlay (multi-instance).
 *
 * - `useOpenTopicPanel()` — imperative hook. One topic of one map gets ONE
 *   deterministic instance id, so opening the same topic twice FOCUSES the
 *   panel already floating instead of stacking a second identical copy, while
 *   two different topics happily sit side by side.
 * - `<TopicalMapTopicPanelController />` — declarative wrapper.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";

import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { selectOpenInstances } from "@ai-matrx/summon/open";
import { focusWindow, restoreWindow } from "@ai-matrx/summon/open";
// (map, topic) is the identity of a panel — not the moment it was opened. The
// format is owned there because the URL hydrator has to read it back.
import { topicPanelInstanceId } from "@/features/marketing/seo/topical-map/panel/topicPanelInstance";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "topicalMapTopicPanel" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenTopicPanelOptions {
  mapId: string;
  /** Topics are addressed by SLUG everywhere the map reasons. */
  slug: string;
  /** The site in scope, or null for every site the caller may view. */
  siteId?: string | null;
}

export interface TopicPanelHandle {
  close: () => void;
}

export function useOpenTopicPanel() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  return useCallback(
    (opts: OpenTopicPanelOptions): TopicPanelHandle => {
      const instanceId = topicPanelInstanceId(opts);
      const open = selectOpenInstances(store.getState(), OVERLAY_ID);
      if (open.some((inst) => inst.instanceId === instanceId)) {
        // This topic is already floating: surface it (un-minimize + raise)
        // rather than re-dispatching into an unchanged pile, which would look
        // to the person like the click did nothing.
        dispatch(restoreWindow(instanceId));
        dispatch(focusWindow(instanceId));
        return {
          close: () =>
            dispatch(opener.close(instanceId)),
        };
      }
      opener.open(dispatch, { instanceId, data: {
            stackIndex: open.length,
            mapId: opts.mapId,
            slug: opts.slug,
            siteId: opts.siteId ?? null,
          } });
      return {
        close: () =>
          dispatch(opener.close(instanceId)),
      };
    },
    [dispatch, store],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the panel on mount, closes
 * it on unmount.
 */
export const TopicalMapTopicPanelController = hookController<OpenTopicPanelOptions>(useOpenTopicPanel);

export type TopicalMapTopicPanelDefinitionData = OpenTopicPanelOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    topicalMapTopicPanel: OverlayWire<TopicalMapTopicPanelDefinitionData>;
  }
}
