// features/kg-suggestions/autoRagKnobs.ts
//
// The scoped-knob addresses the auto-RAG controls write. ONE home, because the
// per-person switch (`useAutoRagPreference`) and the per-organization switches
// (`features/organizations/hooks/useOrgAutoRagPreference`) address the same two
// register keys, and a hand-typed second copy of a key is how a rename becomes
// a control that silently governs nothing.
//
// Both keys live in `platform.feature_knob`; `lib/scoped-config` is the only
// way to read or write them. Until 2026-10-22 they were boolean COLUMNS on
// `iam.organization_preferences` / `users.user_preferences`, resolved by a
// second per-tenant precedence chain in aidream (`effective_setting.py`, now
// deleted). The server reads these keys through that register, so a control
// that wrote the old columns would move on screen and change nothing.

export const KNOWLEDGE_FEATURE = "knowledge";

/**
 * Default ON, delegated to the `organization` and `user` rungs, and
 * `lower_only`: an organization's OFF dominates and a person may opt out
 * further, but neither can turn the other back ON — the resolver DISCARDS a
 * loosening rung. So a person's "on" is not guaranteed to take effect, which is
 * why every writer here reads `effective_value` back instead of assuming.
 */
export const AUTO_RAG_KEY = "auto_rag_enabled";

/** Default OFF, `organization` rung only — the sweep is triggered by org
 * hierarchy changes, not by a person. */
export const SUGGESTION_SWEEPS_KEY = "suggestion_sweeps_enabled";

export const AUTO_RAG_KNOB = { feature: KNOWLEDGE_FEATURE, key: AUTO_RAG_KEY } as const;
export const SUGGESTION_SWEEPS_KNOB = {
  feature: KNOWLEDGE_FEATURE,
  key: SUGGESTION_SWEEPS_KEY,
} as const;

/** The register defaults, for the moment before a snapshot has resolved. */
export const AUTO_RAG_DEFAULT = true;
export const SUGGESTION_SWEEPS_DEFAULT = false;

/** Read a resolved knob as a boolean, falling back to the register default. */
export function asKnobBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
