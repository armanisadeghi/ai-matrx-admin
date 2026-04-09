import { LLM_PARAMS_KEYS } from "@/types/python-generated/llm-enums";
import type { ResolvedConfig } from "./types";
import {
  ControlDefinition,
  NormalizedControls,
} from "@/lib/redux/slices/agent-settings/types";
import { LLMParams } from "@/lib/api/types";
import type { ModelConstraint } from "@/features/ai-models/types";

const FRONTEND_ONLY_KEYS = new Set([
  "tools",
  "image_urls",
  "file_urls",
  "youtube_videos",
  "multi_speaker",
]);

const LEGACY_REMAP_KEYS = new Set(["max_tokens", "output_format", "n"]);

/**
 * Builds the canonical set of keys recognized by the system.
 *
 * Sources (union of):
 *   1. LLM_PARAMS_KEYS — auto-generated from the Python backend schema
 *   2. Model-specific controls — keys the selected model exposes
 *   3. Frontend-only capability flags
 *   4. Legacy DB keys that are remapped at normalization time
 *
 * This replaces the hardcoded `recognizedKeys` set that previously lived
 * inside AgentSettingsCore and could drift from the schema.
 */
export function buildRecognizedKeys(
  normalizedControls: NormalizedControls | null,
): Set<string> {
  const keys = new Set<string>([
    ...LLM_PARAMS_KEYS,
    ...FRONTEND_ONLY_KEYS,
    ...LEGACY_REMAP_KEYS,
  ]);

  if (normalizedControls) {
    for (const key of Object.keys(normalizedControls)) {
      if (key !== "rawControls" && key !== "unmappedControls") {
        keys.add(key);
      }
    }
  }

  return keys;
}

/**
 * Produces a single ResolvedConfig object that validation rules inspect.
 *
 * Consumers never access raw sources directly — this is the only entry point.
 */
export function resolveConfig(
  settings: LLMParams | null,
  modelId: string | null,
  normalizedControls: NormalizedControls | null,
  constraints?: ModelConstraint[] | null,
): ResolvedConfig {
  return {
    settings: settings ?? ({} as LLMParams),
    modelId,
    normalizedControls,
    recognizedKeys: buildRecognizedKeys(normalizedControls),
    constraints: constraints ?? null,
  };
}

/**
 * Look up a ControlDefinition from normalizedControls by key.
 * Shared utility used by individual validation rules.
 */
export function getControlForKey(
  normalizedControls: NormalizedControls | null,
  key: string,
): ControlDefinition | undefined {
  if (!normalizedControls) return undefined;
  return (normalizedControls as unknown as Record<string, ControlDefinition>)[
    key
  ];
}
