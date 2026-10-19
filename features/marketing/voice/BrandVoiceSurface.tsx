"use client";

/**
 * The live half of `matrx-user/marketing-brand-voice`: mounts the room's
 * surface over the brand scope it inherits (`BrandIdentitySurface`) and
 * registers the draft write handlers. `getOwn` is read at trigger time, so the
 * scope is always the page as it is. Mounted only by the Identity voice route
 * (`brandSurface` on `VoicePage`); the settings tab and person pages render
 * `VoicePage` without it.
 */

import type { ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import { useBrandIdentityBaseScope } from "@/features/marketing/components/brand/BrandIdentitySurface";
import { createMarketingBrandVoiceScope } from "@/features/surfaces/manifests/marketing-brand-voice.manifest";

export const MARKETING_BRAND_VOICE_SURFACE_NAME = "matrx-user/marketing-brand-voice" as const;

type OwnVoiceValues = Omit<Parameters<typeof createMarketingBrandVoiceScope>[0], "brand_id">;

export interface VoiceWriteHandlers {
  /** Each throws on bad input or when its control is not on the page. */
  samplesPicked: (value: unknown) => void;
  confirmChoices: (value: unknown) => void;
  fixDraft: (value: unknown) => void;
  fixSurface: (value: unknown) => void;
}

function VoiceWriteTargets({ handlers }: { handlers: VoiceWriteHandlers }) {
  useSurfaceWriteHandlers(MARKETING_BRAND_VOICE_SURFACE_NAME, {
    voice_samples_picked: async (value: unknown) => handlers.samplesPicked(value),
    voice_confirm_choices: async (value: unknown) => handlers.confirmChoices(value),
    voice_fix_draft: async (value: unknown) => handlers.fixDraft(value),
    voice_fix_surface: async (value: unknown) => handlers.fixSurface(value),
  });
  return null;
}

export function BrandVoiceSurface({
  getOwn,
  handlers,
  children,
}: {
  getOwn: () => OwnVoiceValues;
  handlers: VoiceWriteHandlers;
  children: ReactNode;
}) {
  const getBase = useBrandIdentityBaseScope();
  const getScope = (): SurfaceScopePayload => {
    const base = getBase() as { brand_id: string } & Record<string, unknown>;
    return createMarketingBrandVoiceScope({ ...base, ...getOwn() });
  };
  return (
    <SurfaceRuntimeProvider surfaceName={MARKETING_BRAND_VOICE_SURFACE_NAME} getScope={getScope}>
      <VoiceWriteTargets handlers={handlers} />
      {children}
    </SurfaceRuntimeProvider>
  );
}
