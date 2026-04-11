"use client";

/**
 * Hook to parse and normalize model controls from dynamic API data
 * Keeps snake_case naming for compatibility with Python backend
 */

import { LLM_PARAMS_KEYS } from "@/types/python-generated/llm-enums";

export interface ControlDefinition {
  type:
    | "number"
    | "integer"
    | "boolean"
    | "string"
    | "enum"
    | "array"
    | "string_array"
    | "object_array";
  min?: number;
  max?: number;
  default?: any;
  enum?: string[];
  required?: boolean;
}

export interface NormalizedControls {
  // Core sampling controls
  temperature?: ControlDefinition;
  max_tokens?: ControlDefinition; // Legacy alias — remapped to max_output_tokens at parse time
  max_output_tokens?: ControlDefinition;
  top_p?: ControlDefinition;
  top_k?: ControlDefinition;

  // Tool calling
  tool_choice?: ControlDefinition;
  parallel_tool_calls?: ControlDefinition;

  // Reasoning / thinking
  reasoning_effort?: ControlDefinition;
  reasoning_summary?: ControlDefinition;
  thinking_level?: ControlDefinition; // Google Gemini
  include_thoughts?: ControlDefinition;
  thinking_budget?: ControlDefinition; // Anthropic + legacy Gemini
  clear_thinking?: ControlDefinition; // Cerebras: strip <thinking> blocks
  disable_reasoning?: ControlDefinition; // Cerebras: suppress reasoning entirely

  // Output control
  response_format?: ControlDefinition;
  /** @deprecated DB models may still have output_format — remapped to response_format at parse time */
  output_format?: ControlDefinition;
  stop_sequences?: ControlDefinition;
  verbosity?: ControlDefinition;

  // Boolean/stream controls
  store?: ControlDefinition;
  stream?: ControlDefinition;

  // Provider-native features
  internal_web_search?: ControlDefinition;
  internal_url_context?: ControlDefinition;

  // Frontend-only capability flags (never sent to the API)
  tools?: ControlDefinition;
  image_urls?: ControlDefinition;
  file_urls?: ControlDefinition;
  youtube_videos?: ControlDefinition;

  // TTS controls
  tts_voice?: ControlDefinition;
  audio_format?: ControlDefinition;
  multi_speaker?: ControlDefinition; // Google only, frontend-only flag

  // Image generation controls
  size?: ControlDefinition;
  quality?: ControlDefinition;
  count?: ControlDefinition;
  n?: ControlDefinition; // Legacy alias for count
  seed?: ControlDefinition;
  steps?: ControlDefinition;
  width?: ControlDefinition;
  height?: ControlDefinition;
  guidance_scale?: ControlDefinition;
  negative_prompt?: ControlDefinition;
  output_format_img?: ControlDefinition; // image-specific output format
  output_quality?: ControlDefinition;
  disable_safety_checker?: ControlDefinition;

  // Video generation controls
  fps?: ControlDefinition;
  seconds?: ControlDefinition;
  frame_images?: ControlDefinition;

  // Advanced image controls
  image_loras?: ControlDefinition;
  reference_images?: ControlDefinition;

  // Raw controls for debugging
  rawControls: Record<string, any>;

  // Unmapped controls that we couldn't resolve
  unmappedControls: Record<string, any>;
}

/**
 * Parse and normalize controls from a model's controls object
 */
export function useModelControls(models: any[], selectedModelId: string) {
  // If no ID provided, just return empty state without error
  if (!selectedModelId) {
    return {
      normalizedControls: null,
      selectedModel: null,
      error: null,
    };
  }

  // Find the selected model by ID (UUID)
  const selectedModel = models.find((m) => m.id === selectedModelId);

  if (!selectedModel) {
    // Only log error if we have models loaded but still can't find the ID
    if (models.length > 0) {
      console.error("Model not found:", {
        selectedModelId,
        availableModelIds: models.map((m) => m.id),
        models,
      });
    }
    return {
      normalizedControls: null,
      selectedModel: null,
      error: `Model not found: ${selectedModelId}`,
    };
  }

  // If no controls, return empty normalized controls (everything disabled)
  if (!selectedModel.controls) {
    return {
      normalizedControls: {
        rawControls: {},
        unmappedControls: {},
      } as NormalizedControls,
      selectedModel,
      error: null,
    };
  }

  // Defensively parse controls if it was stored as a JSON string (double-encoded)
  let controls = selectedModel.controls;
  if (typeof controls === "string") {
    try {
      controls = JSON.parse(controls);
    } catch {
      console.error(
        "Failed to parse model controls JSON string for model:",
        selectedModel.name,
      );
      return {
        normalizedControls: {
          rawControls: {},
          unmappedControls: {},
        } as NormalizedControls,
        selectedModel,
        error: `Invalid controls JSON for model: ${selectedModel.name}`,
      };
    }
  }
  // Guard: controls must be a plain object to iterate safely
  if (
    typeof controls !== "object" ||
    controls === null ||
    Array.isArray(controls)
  ) {
    console.error(
      "Unexpected controls shape for model:",
      selectedModel.name,
      controls,
    );
    return {
      normalizedControls: {
        rawControls: {},
        unmappedControls: {},
      } as NormalizedControls,
      selectedModel,
      error: null,
    };
  }
  const normalized: NormalizedControls = {
    rawControls: controls,
    unmappedControls: {},
  };

  // LLM_PARAMS_KEYS is type-checked against the generated LLMParams schema.
  // Frontend-only keys (not in LLMParams) are listed separately.
  const knownKeys = new Set<string>([
    ...LLM_PARAMS_KEYS,
    // Legacy DB keys — normalizer converts these at the Redux boundary,
    // but we still recognise them here for any un-normalised controls data.
    "max_tokens",
    "output_format",
    "n",
    // UI capability flags from model controls (e.g. { allowed: true }).
    // These indicate what a model supports — they are not LLMParams fields.
    // Actual tool definitions are assembled separately via client_tools.
    "tools",
    "file_urls",
    "image_urls",
    "youtube_videos",
    "multi_speaker",
  ]);

  // Parse each control
  Object.entries(controls).forEach(([key, value]: [string, any]) => {
    // Track unmapped controls first
    if (!knownKeys.has(key)) {
      normalized.unmappedControls[key] = value;
      return;
    }

    // Remap output_format -> response_format (backend uses response_format)
    const normalizedKey = key === "output_format" ? "response_format" : key;

    // Guard: skip primitive values — control definitions must be objects
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      console.warn(
        `Skipping malformed control "${key}" for model — expected object, got:`,
        typeof value,
      );
      return;
    }

    // Flatten object defaults with a "type" property (e.g. { type: "json_object" } → "json_object")
    const rawDefault = value.default;
    const flatDefault =
      rawDefault !== null &&
      typeof rawDefault === "object" &&
      !Array.isArray(rawDefault) &&
      "type" in rawDefault
        ? String(rawDefault.type)
        : rawDefault;

    // Parse the control definition based on its structure
    const controlDef: ControlDefinition = {
      type: value.type || "string",
      min: value.min,
      max: value.max,
      default: flatDefault,
      required: value.required,
    };

    // Handle enum types — flatten object enum entries to strings (e.g. { type: "json_object" } → "json_object")
    if (value.enum && Array.isArray(value.enum)) {
      controlDef.enum = value.enum.map((option: unknown) => {
        if (
          option !== null &&
          typeof option === "object" &&
          "type" in (option as Record<string, unknown>)
        ) {
          return String((option as Record<string, unknown>).type);
        }
        return String(option);
      });
      controlDef.type = "enum";
    }
    // Handle "allowed" property (feature flags)
    else if ("allowed" in value) {
      controlDef.type = "boolean";
      controlDef.default = value.allowed;
    }
    // Handle plain boolean defaults
    else if (typeof value.default === "boolean") {
      controlDef.type = "boolean";
    }
    // Infer number types from min/max
    else if (value.min !== undefined || value.max !== undefined) {
      // Check if it's an integer or float based on default
      if (value.default && Number.isInteger(value.default)) {
        controlDef.type = "integer";
      } else {
        controlDef.type = "number";
      }
    }

    // Store in normalized controls
    (normalized as any)[normalizedKey] = controlDef;
  });

  return {
    normalizedControls: normalized,
    selectedModel,
    error: null,
  };
}

/**
 * Get default settings from a model's controls
 * Returns ONLY the actual config values that should be submitted/saved
 * UI-only flags (like tools: true) are converted to their proper submission format
 * CRITICAL: Controls with default: null are NOT included (opt-in only)
 */
export function getModelDefaults(model: any) {
  if (!model?.controls) {
    return {};
  }

  const defaults: Record<string, any> = {};

  // Defensively parse controls if double-encoded as a JSON string
  let controls = model.controls;
  if (typeof controls === "string") {
    try {
      controls = JSON.parse(controls);
    } catch {
      console.error(
        "Failed to parse model controls JSON string in getModelDefaults for model:",
        model.name,
      );
      return {};
    }
  }
  if (
    typeof controls !== "object" ||
    controls === null ||
    Array.isArray(controls)
  ) {
    return {};
  }

  // Keys that represent UI capabilities, not submission values
  const uiOnlyKeys = new Set(["tools"]);

  Object.entries(controls).forEach(([key, value]: [string, any]) => {
    // Remap output_format -> response_format
    const normalizedKey = key === "output_format" ? "response_format" : key;

    // Guard: skip primitive values
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return;
    }

    // Skip UI-only capability flags
    if (uiOnlyKeys.has(normalizedKey)) {
      if (normalizedKey === "tools" && value.allowed) {
        defaults[normalizedKey] = [];
      }
      return;
    }

    // Extract default value for actual submission parameters
    // SKIP if default is null - these are opt-in only controls
    let defaultValue: unknown = undefined;
    if (value.default !== undefined && value.default !== null) {
      defaultValue = value.default;
    } else if ("allowed" in value && !uiOnlyKeys.has(normalizedKey)) {
      defaultValue = value.allowed;
    } else if (
      value.enum &&
      Array.isArray(value.enum) &&
      value.enum.length > 0
    ) {
      defaultValue = value.enum[0];
    }

    if (defaultValue === undefined) return;

    // For response_format: convert string -> dict, skip "text" (default behavior)
    if (
      normalizedKey === "response_format" &&
      typeof defaultValue === "string"
    ) {
      if (defaultValue === "text" || defaultValue === "") return;
      defaults[normalizedKey] = { type: defaultValue };
      return;
    }

    defaults[normalizedKey] = defaultValue;
  });

  return defaults;
}
