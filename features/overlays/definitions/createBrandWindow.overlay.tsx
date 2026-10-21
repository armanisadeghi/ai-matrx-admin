"use client";

/** Typed, callback-aware opener for the "Add brand" window (the shared brand create body). */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import {
  createCreateBrandCallbackGroup,
  type CreateBrandWindowHandlers,
} from "@/features/window-panels/windows/marketing/callbacks";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "createBrandWindow" as const;

export type OpenCreateBrandWindowOptions = CreateBrandWindowHandlers;

export interface CreateBrandWindowHandle {
  instanceId: string;
  close: () => void;
  dispose: () => void;
}

export function useOpenCreateBrandWindow() {
  const dispatch = useAppDispatch();
  const live = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    const disposers = live.current;
    return () => {
      for (const dispose of disposers) dispose();
      disposers.clear();
    };
  }, []);

  return useCallback(
    (options: OpenCreateBrandWindowOptions = {}): CreateBrandWindowHandle => {
      const instanceId = `${OVERLAY_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { callbackGroupId, dispose } = createCreateBrandCallbackGroup(options);
      dispatch(openOverlay({ overlayId: OVERLAY_ID, instanceId, data: { callbackGroupId } }));
      live.current.add(dispose);
      const detach = () => {
        dispose();
        live.current.delete(dispose);
      };
      return {
        instanceId,
        close: () => {
          dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId }));
          detach();
        },
        dispose: detach,
      };
    },
    [dispatch],
  );
}

export type CreateBrandWindowDefinitionData = { callbackGroupId?: string | null };

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    createBrandWindow: OverlayWire<CreateBrandWindowDefinitionData>;
  }
}
