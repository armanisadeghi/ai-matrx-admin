"use client";

import { useCallback, useEffect } from "react";

import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay, selectOpenInstances } from "@ai-matrx/summon";
import { focusWindow, restoreWindow } from "@ai-matrx/summon";
import type { DoorAudience } from "@/features/hindsight/subject-doors";
import type { Finding } from "@/features/hindsight/types";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "hindsightFindingWindow" as const;

export interface OpenHindsightFindingWindowOptions {
  finding: Finding;
  findings: Finding[];
  agentId?: string | null;
  audience: DoorAudience;
}

export interface HindsightFindingWindowHandle {
  close: () => void;
}

function instanceIdFor(enrollmentId: string): string {
  return `hindsight-findings|${enrollmentId}`;
}

export function useOpenHindsightFindingWindow() {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  return useCallback(
    (opts: OpenHindsightFindingWindowOptions): HindsightFindingWindowHandle => {
      const instanceId = instanceIdFor(opts.finding.enrollment_id);
      const open = selectOpenInstances(store.getState(), OVERLAY_ID);
      if (open.some((instance) => instance.instanceId === instanceId)) {
        dispatch(
          openOverlay({
            overlayId: OVERLAY_ID,
            instanceId,
            data: {
              finding: opts.finding,
              findings: opts.findings,
              agentId: opts.agentId ?? null,
              audience: opts.audience,
            },
          }),
        );
        dispatch(restoreWindow(instanceId));
        dispatch(focusWindow(instanceId));
        return {
          close: () =>
            dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
        };
      }

      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            finding: opts.finding,
            findings: opts.findings,
            agentId: opts.agentId ?? null,
            audience: opts.audience,
          },
        }),
      );

      return {
        close: () =>
          dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
      };
    },
    [dispatch, store],
  );
}

export function HindsightFindingWindowController(
  props: OpenHindsightFindingWindowOptions,
): null {
  const open = useOpenHindsightFindingWindow();

  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.finding, props.findings, props.agentId, props.audience]);

  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type HindsightFindingWindowDefinitionData = OpenHindsightFindingWindowOptions;

export const hindsightFindingWindowOverlay = defineOverlay<HindsightFindingWindowDefinitionData>()({
  id: "hindsightFindingWindow",
  label: "Hindsight Finding",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          finding: null,
          findings: [],
          agentId: null,
          audience: "product",
        },
    windowId: "hindsight-finding-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./hindsightFindingWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    hindsightFindingWindow: OverlayWire<HindsightFindingWindowDefinitionData>;
  }
}
