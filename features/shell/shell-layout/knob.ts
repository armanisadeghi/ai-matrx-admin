// features/shell/shell-layout/knob.ts — the one policy knob of custom layouts (custom-experience §5.2).
//
// `shell.members_may_customize` (boolean, default true, overridable by the organization only): when an
// organization turns it off, every member's own layout is ignored and the organization's layout applies.
// The policy lives in the knob; the layouts live in the records (rule 19 of the feature-knobs SoR).
export const SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB = { feature: "shell", key: "members_may_customize" } as const;
