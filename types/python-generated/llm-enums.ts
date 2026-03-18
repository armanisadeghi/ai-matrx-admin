// AUTO-MAINTAINED — must stay in sync with llm-params.schema.json and api-types.ts.
// Run `pnpm update-api-types` after backend changes. If the backend adds/removes
// enum values or fields, the satisfies clauses below will produce TypeScript errors.

import type { components } from './api-types';

type LLMParams = components['schemas']['LLMParams'];

type NonNullable<T> = T extends null | undefined ? never : T;

// ── Enum value arrays ──────────────────────────────────────────────────────────
// Each array is type-checked: every element must be a valid value for the field.

export const TOOL_CHOICE_OPTIONS = [
    'none', 'auto', 'required',
] as const satisfies readonly NonNullable<LLMParams['tool_choice']>[];

export const REASONING_EFFORT_OPTIONS = [
    'auto', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh',
] as const satisfies readonly NonNullable<LLMParams['reasoning_effort']>[];

export const REASONING_SUMMARY_OPTIONS = [
    'concise', 'detailed', 'never', 'auto', 'always',
] as const satisfies readonly NonNullable<LLMParams['reasoning_summary']>[];

export const THINKING_LEVEL_OPTIONS = [
    'minimal', 'low', 'medium', 'high',
] as const satisfies readonly NonNullable<LLMParams['thinking_level']>[];

// ── LLMParams key set ──────────────────────────────────────────────────────────
// Type-checked: every key here must exist on LLMParams. Used by control parsers
// to distinguish "known backend fields" from "frontend-only/unmapped fields".

export const LLM_PARAMS_KEYS = [
    'model', 'max_output_tokens', 'temperature', 'top_p', 'top_k',
    'tool_choice', 'parallel_tool_calls',
    'reasoning_effort', 'reasoning_summary', 'thinking_level',
    'include_thoughts', 'thinking_budget',
    'response_format', 'stop_sequences',
    'stream', 'store', 'verbosity',
    'internal_web_search', 'internal_url_context',
    'size', 'quality', 'count',
    'tts_voice', 'audio_format',
    'seconds', 'fps', 'steps', 'seed',
    'guidance_scale', 'output_quality', 'negative_prompt', 'output_format',
    'width', 'height', 'frame_images', 'reference_images', 'disable_safety_checker',
] as const satisfies readonly (keyof LLMParams)[];

// image_loras is live on the backend but not yet in the generated types.
// After `pnpm update-api-types`, move it into LLM_PARAMS_KEYS above.

export type LLMParamsKey = (typeof LLM_PARAMS_KEYS)[number];
