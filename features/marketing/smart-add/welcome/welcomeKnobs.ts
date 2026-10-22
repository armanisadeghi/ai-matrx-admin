/**
 * Sign-up welcome — the limits of the found search and the "Which one is you?" cards, as feature knobs
 * (`platform.feature_knob`, feature `welcome`; seeded by aidream/db/migrations/wf_107_welcome_found_search_knobs.sql).
 * Limits are knobs (CLAUDE.md): an organization or an agent turns them with no deploy.
 *
 * The seeded `default_value` is the number the code used to hold. `WELCOME_KNOB_DEFAULTS` mirrors it ONLY so the
 * welcome keeps working in the window before that migration is applied live: a knob that cannot be read is logged
 * loudly (console error capture) and the default is used, never silently. Delete the mirror once the rows are live
 * (the platform reader's rule is that a missing knob raises).
 */

import { knobInt } from "@/lib/knobs/featureKnobs";

export const WELCOME_KNOB_FEATURE = "welcome";

/** Knob key per limit. */
export const WELCOME_KNOB_KEYS = {
  /** The longest the "Which one is you?" cards wait for the shared-photo groups. */
  photoGroupsWaitMs: "photo_groups_wait_ms",
  /** How often an open app checks a running found-search round. */
  foundPollMs: "found_poll_ms",
  /** How long after a round started an open app keeps checking it. */
  foundPollForMs: "found_poll_for_ms",
} as const;

export type WelcomeKnobName = keyof typeof WELCOME_KNOB_KEYS;

/** The seeded defaults (the old constants). */
export const WELCOME_KNOB_DEFAULTS: Readonly<Record<WelcomeKnobName, number>> = {
  photoGroupsWaitMs: 6000,
  foundPollMs: 30_000,
  foundPollForMs: 15 * 60_000,
};

/** One welcome limit: the knob's live value, or (loudly) its seeded default when the knob cannot be read. */
export async function readWelcomeKnob(name: WelcomeKnobName): Promise<number> {
  try {
    return await knobInt(WELCOME_KNOB_FEATURE, WELCOME_KNOB_KEYS[name]);
  } catch (error) {
    console.error(
      `[welcome] The limit "${WELCOME_KNOB_FEATURE}.${WELCOME_KNOB_KEYS[name]}" could not be read; using its default ${WELCOME_KNOB_DEFAULTS[name]}.`,
      error,
    );
    return WELCOME_KNOB_DEFAULTS[name];
  }
}
