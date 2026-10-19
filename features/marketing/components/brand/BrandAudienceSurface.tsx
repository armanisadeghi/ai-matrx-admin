"use client";

/**
 * The live half of `matrx-user/marketing-brand-audience`: mounts the room's
 * surface over the brand scope it inherits (`BrandIdentitySurface`) and
 * registers the persona-draft write handler. `getOwn` is read at trigger time,
 * so the scope is always the page as it is.
 */

import type { ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import { useBrandIdentityBaseScope } from "@/features/marketing/components/brand/BrandIdentitySurface";
import { createMarketingBrandAudienceScope } from "@/features/surfaces/manifests/marketing-brand-audience.manifest";
import {
  personaDemographics,
  type BrandPersona,
  type PersonaDemographics,
} from "@/features/marketing/lib/persona-model";

export const MARKETING_BRAND_AUDIENCE_SURFACE_NAME =
  "matrx-user/marketing-brand-audience" as const;

type OwnAudienceValues = Omit<Parameters<typeof createMarketingBrandAudienceScope>[0], "brand_id">;

/** What the persona editor opens pre-filled with; absent fields keep the persona's own values. */
export interface PersonaDraftSeed {
  name?: string;
  summary?: string;
  demographics?: PersonaDemographics;
  goals?: string[];
  pain_points?: string[];
  objections?: string[];
  channels?: string[];
  is_primary?: boolean;
}

/** A persona as the surface declares it (audience_personas row). */
export function personaForScope(persona: BrandPersona): Record<string, unknown> {
  return {
    id: persona.id,
    name: persona.name,
    summary: persona.summary ?? "",
    demographics: personaDemographics(persona),
    goals: persona.goals,
    pain_points: persona.pain_points,
    objections: persona.objections,
    channels: persona.channels,
    is_primary: persona.is_primary,
    version: persona.version,
  };
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`persona_draft.${field} must be an array of strings.`);
  }
  return value.map((item: string) => item.trim()).filter(Boolean);
}

/** Validates a persona_draft value; throws on anything the editor would not take. */
export function parsePersonaDraft(
  value: unknown,
  rows: readonly BrandPersona[],
  allowedDemographics: readonly string[],
): { persona: BrandPersona | null; seed: PersonaDraftSeed } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("persona_draft takes an object: { persona_id?, name?, summary?, demographics?, goals?, ... }.");
  }
  const input = value as Record<string, unknown>;
  const known = new Set([
    "persona_id", "name", "summary", "demographics", "goals", "pain_points",
    "objections", "channels", "is_primary",
  ]);
  const stray = Object.keys(input).filter((key) => !known.has(key));
  if (stray.length) throw new Error(`persona_draft has unknown field(s): ${stray.join(", ")}.`);

  let persona: BrandPersona | null = null;
  if (input.persona_id !== undefined && input.persona_id !== null) {
    if (typeof input.persona_id !== "string") throw new Error("persona_draft.persona_id must be a string.");
    persona = rows.find((row) => row.id === input.persona_id) ?? null;
    if (!persona) throw new Error("persona_draft.persona_id is not a persona on this page (use an id from audience_personas).");
  }

  const seed: PersonaDraftSeed = {};
  if (input.name !== undefined) {
    if (typeof input.name !== "string" || !input.name.trim()) throw new Error("persona_draft.name must be a non-empty string.");
    seed.name = input.name.trim();
  }
  if (!persona && !seed.name) throw new Error("A new persona needs persona_draft.name.");
  if (input.summary !== undefined) {
    if (typeof input.summary !== "string") throw new Error("persona_draft.summary must be a string.");
    seed.summary = input.summary;
  }
  if (input.demographics !== undefined) {
    const demo = input.demographics;
    if (!demo || typeof demo !== "object" || Array.isArray(demo)) {
      throw new Error("persona_draft.demographics must be an object of strings.");
    }
    const out: PersonaDemographics = {};
    for (const [key, val] of Object.entries(demo as Record<string, unknown>)) {
      if (!allowedDemographics.includes(key)) {
        throw new Error(`persona_draft.demographics.${key} is not offered for this brand (allowed: ${allowedDemographics.join(", ")}).`);
      }
      if (typeof val !== "string") throw new Error(`persona_draft.demographics.${key} must be a string.`);
      (out as Record<string, string>)[key] = val;
    }
    seed.demographics = out;
  }
  for (const field of ["goals", "pain_points", "objections", "channels"] as const) {
    if (input[field] !== undefined) seed[field] = stringList(input[field], field);
  }
  if (input.is_primary !== undefined) {
    if (typeof input.is_primary !== "boolean") throw new Error("persona_draft.is_primary must be true or false.");
    seed.is_primary = input.is_primary;
  }
  return { persona, seed };
}

function AudienceWriteTargets({
  onPersonaDraft,
}: {
  onPersonaDraft: (value: unknown) => void;
}) {
  useSurfaceWriteHandlers(MARKETING_BRAND_AUDIENCE_SURFACE_NAME, {
    persona_draft: async (value: unknown) => {
      onPersonaDraft(value);
    },
  });
  return null;
}

export function BrandAudienceSurface({
  getOwn,
  onPersonaDraft,
  children,
}: {
  getOwn: () => OwnAudienceValues;
  /** Validates and stages the draft in the editor; throws on bad input. */
  onPersonaDraft: (value: unknown) => void;
  children: ReactNode;
}) {
  const getBase = useBrandIdentityBaseScope();
  const getScope = (): SurfaceScopePayload => {
    const base = getBase() as { brand_id: string } & Record<string, unknown>;
    return createMarketingBrandAudienceScope({ ...base, ...getOwn() });
  };
  return (
    <SurfaceRuntimeProvider surfaceName={MARKETING_BRAND_AUDIENCE_SURFACE_NAME} getScope={getScope}>
      <AudienceWriteTargets onPersonaDraft={onPersonaDraft} />
      {children}
    </SurfaceRuntimeProvider>
  );
}
