"use client";

import { useCallback } from "react";

import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { selectOpenInstances } from "@ai-matrx/summon/open";
import { focusWindow, restoreWindow } from "@ai-matrx/summon/open";
import type { DoorAudience } from "@/features/hindsight/subject-doors";
import type { Finding } from "@/features/hindsight/types";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "hindsightFindingWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

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
        opener.open(dispatch, { instanceId, data: {
              finding: opts.finding,
              findings: opts.findings,
              agentId: opts.agentId ?? null,
              audience: opts.audience,
            } });
        dispatch(restoreWindow(instanceId));
        dispatch(focusWindow(instanceId));
        return {
          close: () =>
            dispatch(opener.close(instanceId)),
        };
      }

      opener.open(dispatch, { instanceId, data: {
            finding: opts.finding,
            findings: opts.findings,
            agentId: opts.agentId ?? null,
            audience: opts.audience,
          } });

      return {
        close: () =>
          dispatch(opener.close(instanceId)),
      };
    },
    [dispatch, store],
  );
}

export const HindsightFindingWindowController = hookController<OpenHindsightFindingWindowOptions>(useOpenHindsightFindingWindow);

export type HindsightFindingWindowDefinitionData = OpenHindsightFindingWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    hindsightFindingWindow: OverlayWire<HindsightFindingWindowDefinitionData>;
  }
}
