/**
 * complexity.ts
 *
 * Pure scoring module. Takes an AdvancedRunSettingsValue, returns a single
 * "complexity" number + a per-section breakdown.
 *
 * Concept: the harder a user's combined request is to satisfy, the higher
 * the number. Simple text questions score near zero. Demanding the fastest,
 * cheapest, smartest, video-producing, always-critical-at-everything model
 * scores high — because only a frontier model could satisfy all of it.
 *
 * This file is intentionally just lookups and arithmetic — every weight is
 * a named constant at the top of the file so the algorithm is easy to
 * read, compare, and tweak without touching any UI code.
 *
 * Later, the server-side resolver will use the same shape of breakdown to
 * pick concrete models. For now this is what the UI displays as a
 * "Complexity" badge.
 */

import type {
  AdvancedRunSettingsValue,
  ArtifactSkillKey,
  AttributesValue,
  ImportanceValue,
  InputMode,
  Level,
  PrimaryOutput,
  ToolKey,
} from './constants';

// ============================================================================
//   WEIGHTS — tweak these freely. No UI imports anything from here.
// ============================================================================

/** Standard 5-level scale. Higher level = bigger ask. */
const POINTS_BY_LEVEL: Record<Level, number> = {
  minimal: 0,
  low: 1,
  medium: 3,
  high: 6,
  max: 10,
};

/**
 * Inverted scale for "Cost" — wanting a CHEAPER model is a bigger ask,
 * because it eliminates the premium options from contention.
 */
const POINTS_BY_LEVEL_INVERTED: Record<Level, number> = {
  minimal: 10,
  low: 6,
  medium: 3,
  high: 1,
  max: 0,
};

/** How hard each primary output is to produce. */
const POINTS_BY_PRIMARY_OUTPUT: Record<PrimaryOutput, number> = {
  text: 0,
  image: 6,
  audio: 6,
  video: 12,
};

/** Per input mode. Text is free; rich inputs narrow the model pool. */
const POINTS_BY_INPUT_MODE: Record<InputMode, number> = {
  text: 0,
  documents: 2,
  image: 4,
  audio: 5,
  video: 7,
  youtube: 7,
};

/** Each tool the agent may call adds a small amount. */
const POINTS_PER_TOOL = 2;

/** Each artifact skill is cheap — most models can produce most text outputs. */
const POINTS_PER_ARTIFACT_SKILL = 1;

/** Diminishing-returns cap so selecting all 24 skills doesn't dominate. */
const MAX_ARTIFACT_POINTS = 15;

/** Thinking depth has outsized impact — max forces a reasoning model. */
const THINKING_MULTIPLIER = 2;

// ============================================================================
//   PER-SECTION CALCULATORS
// ============================================================================

function pointsForPrimaryOutput(o: PrimaryOutput): number {
  return POINTS_BY_PRIMARY_OUTPUT[o];
}

function pointsForInputModes(modes: InputMode[]): number {
  let total = 0;
  for (const m of modes) total += POINTS_BY_INPUT_MODE[m];
  return total;
}

function pointsForAttributes(attrs: AttributesValue): number {
  return (
    POINTS_BY_LEVEL[attrs.rawIntelligence] +
    POINTS_BY_LEVEL[attrs.speed] +
    POINTS_BY_LEVEL[attrs.reasoningAbility] +
    POINTS_BY_LEVEL_INVERTED[attrs.cost]
  );
}

function pointsForImportance(importance: ImportanceValue): number {
  let total = 0;
  for (const level of Object.values(importance)) {
    total += POINTS_BY_LEVEL[level];
  }
  return total;
}

function pointsForThinking(level: Level): number {
  return POINTS_BY_LEVEL[level] * THINKING_MULTIPLIER;
}

function pointsForTools(tools: ToolKey[]): number {
  return tools.length * POINTS_PER_TOOL;
}

function pointsForArtifactSkills(skills: ArtifactSkillKey[]): number {
  const raw = skills.length * POINTS_PER_ARTIFACT_SKILL;
  return Math.min(raw, MAX_ARTIFACT_POINTS);
}

// ============================================================================
//   PUBLIC API
// ============================================================================

export interface ComplexityBreakdown {
  primaryOutput: number;
  inputModes: number;
  attributes: number;
  importance: number;
  thinking: number;
  tools: number;
  artifactSkills: number;
}

export interface ComplexityResult {
  total: number;
  breakdown: ComplexityBreakdown;
  band: ComplexityBand;
}

export type ComplexityBand = 'low' | 'moderate' | 'high' | 'extreme';

/**
 * Band thresholds for UI display only. No effect on scoring.
 * Tune here if the UI coloring feels off.
 */
const BAND_THRESHOLDS: { band: ComplexityBand; max: number }[] = [
  { band: 'low', max: 20 },
  { band: 'moderate', max: 40 },
  { band: 'high', max: 65 },
  { band: 'extreme', max: Infinity },
];

export function complexityBand(total: number): ComplexityBand {
  for (const { band, max } of BAND_THRESHOLDS) {
    if (total <= max) return band;
  }
  return 'extreme';
}

export function computeComplexity(
  value: AdvancedRunSettingsValue,
): ComplexityResult {
  const breakdown: ComplexityBreakdown = {
    primaryOutput: pointsForPrimaryOutput(value.primaryOutput),
    inputModes: pointsForInputModes(value.inputModes),
    attributes: pointsForAttributes(value.attributes),
    importance: pointsForImportance(value.importance),
    thinking: pointsForThinking(value.thinkingLevel),
    tools: pointsForTools(value.tools),
    artifactSkills: pointsForArtifactSkills(value.artifactSkills),
  };

  const total =
    breakdown.primaryOutput +
    breakdown.inputModes +
    breakdown.attributes +
    breakdown.importance +
    breakdown.thinking +
    breakdown.tools +
    breakdown.artifactSkills;

  return { total, breakdown, band: complexityBand(total) };
}
