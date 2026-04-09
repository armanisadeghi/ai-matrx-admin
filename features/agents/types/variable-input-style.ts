/**
 * Single source of truth for agent variable collection UI modes.
 * Used by instance UI state, launch overrides, SmartAgentInput, and test sidebar.
 */

export const VARIABLE_INPUT_STYLES = [
  "inline",
  "wizard",
  "form",
  "compact",
  "guided",
  "cards",
] as const;

export type VariableInputStyle = (typeof VARIABLE_INPUT_STYLES)[number];

export const VARIABLE_INPUT_STYLE_OPTIONS: ReadonlyArray<{
  value: VariableInputStyle;
  label: string;
  description: string;
}> = [
  {
    value: "inline",
    label: "Inline",
    description: "Single-line rows with expand popover (default)",
  },
  {
    value: "wizard",
    label: "Wizard",
    description: "One variable at a time, compact VariableInput popover style",
  },
  {
    value: "form",
    label: "Form",
    description: "Collapsible form with full field controls",
  },
  {
    value: "compact",
    label: "Compact stack",
    description: "Full VariableInput per row, no popover (modal-style density)",
  },
  {
    value: "guided",
    label: "Guided",
    description: "Step-by-step with large tappable options",
  },
  {
    value: "cards",
    label: "Cards",
    description: "Small card per variable with micro inputs",
  },
];

export function isVariableInputStyle(v: string): v is VariableInputStyle {
  return (VARIABLE_INPUT_STYLES as readonly string[]).includes(v);
}
