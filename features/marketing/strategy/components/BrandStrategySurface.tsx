"use client";

/**
 * The live half of `matrx-user/marketing-brand-strategy`: mounts the room's
 * surface over the brand scope it inherits (`BrandIdentitySurface`) and
 * registers the corrections-draft write handler. Brand scope only — the site
 * brief reuses `StrategyBriefWorkspace` outside the Identity layout.
 *
 * `getOwn` is read at trigger time, so the scope is always the page as it is.
 */

import { createContext, useContext, type ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import { ProTextarea } from "@/components/official/ProTextarea";
import { useBrandIdentityBaseScope } from "@/features/marketing/components/brand/BrandIdentitySurface";
import { createMarketingBrandStrategyScope } from "@/features/surfaces/manifests/marketing-brand-strategy.manifest";

export const MARKETING_BRAND_STRATEGY_SURFACE_NAME =
  "matrx-user/marketing-brand-strategy" as const;

type OwnStrategyValues = Omit<
  Parameters<typeof createMarketingBrandStrategyScope>[0],
  "brand_id"
>;

const StrategyScopeContext = createContext<(() => SurfaceScopePayload) | null>(null);

/**
 * The room's full scope reader for inputs inside it (the corrections box);
 * null in site scope, where this surface is not mounted.
 */
export function useBrandStrategyScope(): (() => SurfaceScopePayload) | null {
  return useContext(StrategyScopeContext);
}

function StrategyWriteTargets({
  onGuidanceDraft,
}: {
  onGuidanceDraft: (text: string) => void;
}) {
  useSurfaceWriteHandlers(MARKETING_BRAND_STRATEGY_SURFACE_NAME, {
    strategy_guidance_draft: async (value: unknown) => {
      if (typeof value !== "string") {
        throw new Error("strategy_guidance_draft takes the full corrections text as a string.");
      }
      onGuidanceDraft(value);
    },
  });
  return null;
}

export function BrandStrategySurface({
  getOwn,
  onGuidanceDraft,
  children,
}: {
  getOwn: () => OwnStrategyValues;
  /** Null when there is no strategy yet: the corrections box does not exist. */
  onGuidanceDraft: ((text: string) => void) | null;
  children: ReactNode;
}) {
  const getBase = useBrandIdentityBaseScope();
  const getScope = (): SurfaceScopePayload => {
    const base = getBase() as { brand_id: string } & Record<string, unknown>;
    return createMarketingBrandStrategyScope({ ...base, ...getOwn() });
  };
  return (
    <SurfaceRuntimeProvider
      surfaceName={MARKETING_BRAND_STRATEGY_SURFACE_NAME}
      getScope={getScope}
    >
      {onGuidanceDraft ? <StrategyWriteTargets onGuidanceDraft={onGuidanceDraft} /> : null}
      <StrategyScopeContext.Provider value={getScope}>{children}</StrategyScopeContext.Provider>
    </SurfaceRuntimeProvider>
  );
}

/** The corrections box: agent-aware in brand scope, a plain Pro textarea otherwise. */
export function StrategyCorrectionsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  const getScope = useBrandStrategyScope();
  return (
    <ProTextarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoGrow
      minHeight={96}
      {...(getScope
        ? { surfaceName: MARKETING_BRAND_STRATEGY_SURFACE_NAME, getApplicationScope: getScope }
        : {})}
    />
  );
}
