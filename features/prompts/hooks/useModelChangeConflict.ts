"use client";

import { useCallback } from "react";
import { PromptSettings } from "@/features/prompts/types/core";
import { useModelControls, NormalizedControls, getModelDefaults } from "./useModelControls";
import type { ConflictItem, ModelChangeConflictData } from "@/features/prompts/components/builder/ModelChangeConflictModal";

// Keys that are internal/meta and should never be treated as conflicts
const META_KEYS = new Set(["model_id", "tools"]);

// Keys that are always considered valid submission parameters regardless of model
const ALWAYS_VALID_KEYS = new Set([
    "model_id", "temperature", "max_tokens", "max_output_tokens",
    "top_p", "top_k", "stream", "store", "tools", "output_format",
]);

/**
 * Given the current settings and a new model's controls, compute all conflicts.
 *
 * Rules:
 * - A key is "unsupported" if the new model has no control definition for it
 *   (and it's not in ALWAYS_VALID_KEYS).
 * - A numeric value is "out_of_range" if the new model's control defines min/max
 *   and the current value falls outside that range.
 * - An enum value is "invalid" if the new model's control is an enum and the
 *   current value isn't in the new enum list.
 */
function detectConflicts(
    currentSettings: PromptSettings,
    newModelControls: NormalizedControls | null,
    newModelDefaults: Record<string, unknown>
): { conflicts: ConflictItem[]; supportedKeys: string[] } {
    if (!newModelControls) {
        return { conflicts: [], supportedKeys: [] };
    }

    const conflicts: ConflictItem[] = [];
    const supportedKeys: string[] = [];

    for (const [key, currentValue] of Object.entries(currentSettings)) {
        if (META_KEYS.has(key)) continue;
        if (currentValue === null || currentValue === undefined) continue;

        // tools array: validate entries but don't flag the key itself
        if (key === "tools") {
            supportedKeys.push(key);
            continue;
        }

        const controlDef = (newModelControls as unknown as Record<string, unknown>)[key];

        // Key not in the new model's control definitions
        if (!controlDef && !ALWAYS_VALID_KEYS.has(key)) {
            conflicts.push({
                key,
                currentValue,
                newModelDefault: undefined,
                reason: "unsupported_key",
                description: `"${key}" is not a recognized setting for this model and will be ignored or cause an error.`,
            });
            continue;
        }

        // Key is supported — check value validity
        if (controlDef && typeof controlDef === "object" && controlDef !== null) {
            const def = controlDef as {
                type: string;
                min?: number;
                max?: number;
                enum?: string[];
                default?: unknown;
            };

            // Numeric range check
            if (
                (def.type === "number" || def.type === "integer") &&
                typeof currentValue === "number"
            ) {
                if (def.min !== undefined && currentValue < def.min) {
                    conflicts.push({
                        key,
                        currentValue,
                        newModelDefault: newModelDefaults[key] ?? def.default,
                        reason: "value_out_of_range",
                        description: `Value ${currentValue} is below the minimum of ${def.min} for this model.`,
                    });
                    continue;
                }
                if (def.max !== undefined && currentValue > def.max) {
                    conflicts.push({
                        key,
                        currentValue,
                        newModelDefault: newModelDefaults[key] ?? def.default,
                        reason: "value_out_of_range",
                        description: `Value ${currentValue} exceeds the maximum of ${def.max} for this model.`,
                    });
                    continue;
                }
            }

            // Enum validity check
            if (def.type === "enum" && Array.isArray(def.enum)) {
                const valueStr = typeof currentValue === "object" && currentValue !== null && "type" in currentValue
                    ? String((currentValue as Record<string, unknown>).type)
                    : String(currentValue);
                if (!def.enum.includes(valueStr)) {
                    conflicts.push({
                        key,
                        currentValue,
                        newModelDefault: newModelDefaults[key] ?? def.default,
                        reason: "invalid_enum_value",
                        description: `Value "${valueStr}" is not a valid option for this model. Valid options: ${def.enum.slice(0, 5).join(", ")}${def.enum.length > 5 ? "…" : ""}.`,
                    });
                    continue;
                }
            }
        }

        supportedKeys.push(key);
    }

    return { conflicts, supportedKeys };
}

/**
 * Hook that provides a function to compute model change conflict data.
 * Call buildConflictData(newModelId, currentSettings) to get the full conflict report.
 */
export function useModelChangeConflict(models: any[]) {
    const buildConflictData = useCallback(
        (
            prevModelId: string,
            newModelId: string,
            currentSettings: PromptSettings
        ): ModelChangeConflictData | null => {
            const prevModel = models.find((m) => m.id === prevModelId);
            const newModel = models.find((m) => m.id === newModelId);

            if (!newModel) return null;

            // Get normalized controls for the new model by calling the pure logic
            // (useModelControls is a hook so we can't call it here; replicate the logic)
            const { normalizedControls } = parseModelControls(newModel);
            const newModelDefaults = getModelDefaults(newModel);

            const { conflicts, supportedKeys } = detectConflicts(
                currentSettings,
                normalizedControls,
                newModelDefaults
            );

            return {
                prevModelName: prevModel?.name ?? prevModelId,
                newModelName: newModel.name ?? newModelId,
                newModelId,
                currentSettings,
                supportedKeys,
                conflicts,
                newModelControls: normalizedControls,
            };
        },
        [models]
    );

    return { buildConflictData };
}

/**
 * Pure function version of useModelControls for use inside callbacks.
 * Duplicates the essential parsing logic without the hook wrapper.
 */
function parseModelControls(model: any): { normalizedControls: NormalizedControls | null } {
    if (!model?.controls) {
        return { normalizedControls: { rawControls: {}, unmappedControls: {} } as NormalizedControls };
    }

    let controls = model.controls;
    if (typeof controls === "string") {
        try {
            controls = JSON.parse(controls);
        } catch {
            return { normalizedControls: null };
        }
    }
    if (typeof controls !== "object" || controls === null || Array.isArray(controls)) {
        return { normalizedControls: null };
    }

    const normalized: NormalizedControls = {
        rawControls: controls,
        unmappedControls: {},
    };

    const knownKeys = new Set([
        "temperature", "max_tokens", "max_output_tokens", "top_p", "top_k",
        "thinking_budget", "include_thoughts", "internal_url_context",
        "reasoning_effort", "verbosity", "reasoning_summary", "output_format", "tool_choice",
        "stop_sequences", "tools", "stream", "store",
        "file_urls", "image_urls", "internal_web_search", "parallel_tool_calls", "youtube_videos",
        "tts_voice", "audio_format", "multi_speaker",
        "n", "seed", "steps", "width", "height", "guidance_scale", "negative_prompt",
        "response_format", "fps", "seconds", "output_quality", "image_loras",
        "frame_images", "reference_images", "disable_safety_checker",
    ]);

    Object.entries(controls).forEach(([key, value]: [string, any]) => {
        const normalizedKey = key === "output_format" ? "response_format" : key;
        if (!knownKeys.has(key)) {
            normalized.unmappedControls[key] = value;
            return;
        }
        if (typeof value !== "object" || value === null || Array.isArray(value)) return;

        const rawDefault = value.default;
        const flatDefault =
            rawDefault !== null &&
            typeof rawDefault === "object" &&
            !Array.isArray(rawDefault) &&
            "type" in rawDefault
                ? String(rawDefault.type)
                : rawDefault;

        const controlDef = {
            type: value.type || "string",
            min: value.min,
            max: value.max,
            default: flatDefault,
            required: value.required,
        } as any;

        if (value.enum && Array.isArray(value.enum)) {
            controlDef.enum = value.enum.map((option: unknown) => {
                if (option !== null && typeof option === "object" && "type" in (option as Record<string, unknown>)) {
                    return String((option as Record<string, unknown>).type);
                }
                return String(option);
            });
            controlDef.type = "enum";
        } else if ("allowed" in value) {
            controlDef.type = "boolean";
            controlDef.default = value.allowed;
        } else if (typeof value.default === "boolean") {
            controlDef.type = "boolean";
        } else if (value.min !== undefined || value.max !== undefined) {
            controlDef.type = value.default && Number.isInteger(value.default) ? "integer" : "number";
        }

        (normalized as any)[normalizedKey] = controlDef;
    });

    return { normalizedControls: normalized };
}
