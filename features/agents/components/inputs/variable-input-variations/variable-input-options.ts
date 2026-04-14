import {
  VARIABLE_COMPONENT_TYPES,
  type VariableComponentType,
} from "@/features/agents/types/agent-definition.types";

// ─── Re-export so consumers only need this file ────────────────────────────
export { VARIABLE_COMPONENT_TYPES };
export type { VariableComponentType };

// ─── Metadata for each component type ─────────────────────────────────────

const COMPONENT_TYPE_META: Record<
  VariableComponentType,
  {
    label: string;
    description: string;
    requiresOptions: boolean;
    requiresToggleValues: boolean;
    requiresMinMax: boolean;
  }
> = {
  textarea: {
    label: "Text",
    description: "Multi-line free text entry",
    requiresOptions: false,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  toggle: {
    label: "Toggle",
    description: "Simple on/off switch with custom labels",
    requiresOptions: false,
    requiresToggleValues: true,
    requiresMinMax: false,
  },
  "light-switch": {
    label: "Light Switch",
    description: "3D toggle switch with custom labels",
    requiresOptions: false,
    requiresToggleValues: true,
    requiresMinMax: false,
  },
  radio: {
    label: "Radio",
    description: "Single-select list with radio indicators",
    requiresOptions: true,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  "pill-toggle": {
    label: "Pill Toggle",
    description: "Segmented pill control — best for 2–4 short options",
    requiresOptions: true,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  "selection-list": {
    label: "Selection List",
    description: "All options as a single-column button list",
    requiresOptions: true,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  buttons: {
    label: "Buttons",
    description: "All options as an auto-grid of buttons",
    requiresOptions: true,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  checkbox: {
    label: "Checkboxes",
    description: "Multi-select list with checkboxes",
    requiresOptions: true,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  select: {
    label: "Dropdown",
    description: "Compact dropdown single-select",
    requiresOptions: true,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  number: {
    label: "Number",
    description: "Number stepper with optional min/max/step",
    requiresOptions: false,
    requiresToggleValues: false,
    requiresMinMax: false,
  },
  slider: {
    label: "Slider",
    description: "Range slider with min/max/step",
    requiresOptions: false,
    requiresToggleValues: false,
    requiresMinMax: true,
  },
};

// ─── Derived options list — use this for UI selects/dropdowns ─────────────

export type ComponentTypeOption = {
  value: VariableComponentType;
  label: string;
  description: string;
  requiresOptions: boolean;
  requiresToggleValues: boolean;
  requiresMinMax: boolean;
};

/** Returns all component types as selectable options, in display order. */
export function getComponentTypeOptions(): ComponentTypeOption[] {
  return VARIABLE_COMPONENT_TYPES.map((type) => ({
    value: type,
    ...COMPONENT_TYPE_META[type],
  }));
}

/** Returns metadata for a single component type. */
export function getComponentTypeMeta(type: VariableComponentType) {
  return COMPONENT_TYPE_META[type];
}

// ─── Variable input layout styles ─────────────────────────────────────────

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
    description: "One variable at a time, compact popover style",
  },
  {
    value: "form",
    label: "Form",
    description: "Collapsible form with full field controls",
  },
  {
    value: "compact",
    label: "Stacked",
    description: "Full input per row, no popover (modal-style density)",
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
