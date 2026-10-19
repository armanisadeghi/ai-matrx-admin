"use client";

/**
 * The live half of `matrx-user/marketing-brand-guidelines`: mounts the room's
 * surface over the site scope it inherits and registers the editor-draft write
 * handler. Mounted ONLY by the identity Guidelines route.
 *
 * The editor state lives in `KwGuidelinesPanel`, so the panel PUBLISHES it to
 * this bridge (`useGuidelinesRoomPublish`) after every render; `getScope` and
 * the write handler read it at trigger time. Outside this room the bridge is
 * null and the panel behaves exactly as before.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  SurfaceRuntimeProvider,
  useSurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import { useMarketingSiteSurfaceBase } from "@/features/marketing/lib/scopes/site-surface-base";
import { createMarketingBrandGuidelinesScope } from "@/features/surfaces/manifests/marketing-brand-guidelines.manifest";

export const MARKETING_BRAND_GUIDELINES_SURFACE_NAME =
  "matrx-user/marketing-brand-guidelines" as const;

type OwnGuidelinesValues = Omit<
  Parameters<typeof createMarketingBrandGuidelinesScope>[0],
  "brand_id" | "site_id"
>;

/** What the panel publishes: its live values and its draft setter. */
export interface GuidelinesRoomState {
  own: OwnGuidelinesValues;
  setDraft: (text: string) => void;
}

interface GuidelinesRoomBridge {
  publish: (state: GuidelinesRoomState | null) => void;
  getScope: () => SurfaceScopePayload;
}

const GuidelinesRoomContext = createContext<GuidelinesRoomBridge | null>(null);

/** The room's full scope reader for inputs inside it; null outside the room. */
export function useGuidelinesRoomScope(): (() => SurfaceScopePayload) | null {
  return useContext(GuidelinesRoomContext)?.getScope ?? null;
}

/** Called by the panel on every render; a no-op outside the room. */
export function useGuidelinesRoomPublish(state: GuidelinesRoomState): void {
  const bridge = useContext(GuidelinesRoomContext);
  const publish = bridge?.publish;
  useEffect(() => {
    publish?.(state);
  });
  useEffect(() => {
    return () => publish?.(null);
  }, [publish]);
}

function GuidelinesWriteTargets({ state }: { state: RefObject<GuidelinesRoomState | null> }) {
  useSurfaceWriteHandlers(MARKETING_BRAND_GUIDELINES_SURFACE_NAME, {
    guidelines_draft_text: async (value: unknown) => {
      if (typeof value !== "string") {
        throw new Error("guidelines_draft_text takes the full guidelines text as a string.");
      }
      const current = state.current;
      if (!current) {
        throw new Error("The guidelines editor is not ready yet; try again once it has loaded.");
      }
      current.setDraft(value);
    },
  });
  return null;
}

export function GuidelinesRoomSurface({ children }: { children: ReactNode }) {
  const { getBaseValues } = useMarketingSiteSurfaceBase();
  const state = useRef<GuidelinesRoomState | null>(null);
  const publish = (next: GuidelinesRoomState | null) => {
    state.current = next;
  };
  const getScope = (): SurfaceScopePayload => {
    const base = getBaseValues();
    return createMarketingBrandGuidelinesScope({ ...base, ...(state.current?.own ?? {}) });
  };
  return (
    <SurfaceRuntimeProvider
      surfaceName={MARKETING_BRAND_GUIDELINES_SURFACE_NAME}
      getScope={getScope}
    >
      <GuidelinesWriteTargets state={state} />
      <GuidelinesRoomContext.Provider value={{ publish, getScope }}>
        {children}
      </GuidelinesRoomContext.Provider>
    </SurfaceRuntimeProvider>
  );
}
