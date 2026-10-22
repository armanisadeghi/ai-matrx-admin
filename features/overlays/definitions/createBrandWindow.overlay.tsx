"use client";

/** Typed, callback-aware opener for the "Add brand" window (the shared brand create body). */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { mintInstanceId } from "@ai-matrx/summon/open";
import {
  createCreateBrandCallbackGroup,
  type CreateBrandWindowHandlers,
} from "@/features/window-panels/windows/marketing/callbacks";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const OVERLAY_ID = "createBrandWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export type OpenCreateBrandWindowOptions = CreateBrandWindowHandlers;

export interface CreateBrandWindowHandle {
  instanceId: string;
  close: () => void;
  dispose: () => void;
}

export function useOpenCreateBrandWindow() {
  const dispatch = useAppDispatch();

  // The opened window owns its callback group (it releases it on close / its own window-close
  // event); this hook never drops it on unmount — a menu or sheet that opened the window unmounts
  // first (an-opened-window-owns-its-callback-group.test.ts).

  return useCallback(
    (options: OpenCreateBrandWindowOptions = {}): CreateBrandWindowHandle => {
      const instanceId = mintInstanceId(OVERLAY_ID);
      const { callbackGroupId, dispose } = createCreateBrandCallbackGroup(options);
      opener.open(dispatch, { instanceId, data: { callbackGroupId } });
      const detach = () => {
        dispose();
      };
      return {
        instanceId,
        close: () => {
          dispatch(opener.close(instanceId));
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
