// Public entry point for the settings component library.
// Tabs import ONLY from this file. Never reach into primitives/* or layout/* directly.

// Types
export type {
  SettingsBadge,
  SettingsCommonProps,
  SettingsRowVariant,
  SettingsRowDensity,
  SettingsControlSize,
  SettingsOption,
} from "./types";

// Base row (rarely used directly — prefer a primitive below)
export { SettingsRow } from "./SettingsRow";

// Form primitives
export { SettingsSwitch } from "./primitives/SettingsSwitch";
export type { SettingsSwitchProps } from "./primitives/SettingsSwitch";

export { SettingsSelect } from "./primitives/SettingsSelect";
export type { SettingsSelectProps } from "./primitives/SettingsSelect";

export { SettingsSlider } from "./primitives/SettingsSlider";
export type { SettingsSliderProps } from "./primitives/SettingsSlider";

export { SettingsNumberInput } from "./primitives/SettingsNumberInput";
export type { SettingsNumberInputProps } from "./primitives/SettingsNumberInput";

export { SettingsTextInput } from "./primitives/SettingsTextInput";
export type { SettingsTextInputProps } from "./primitives/SettingsTextInput";

export { SettingsTextarea } from "./primitives/SettingsTextarea";
export type { SettingsTextareaProps } from "./primitives/SettingsTextarea";

export { SettingsRadioGroup } from "./primitives/SettingsRadioGroup";
export type { SettingsRadioGroupProps } from "./primitives/SettingsRadioGroup";

export { SettingsCheckbox } from "./primitives/SettingsCheckbox";
export type { SettingsCheckboxProps } from "./primitives/SettingsCheckbox";

export { SettingsSegmented } from "./primitives/SettingsSegmented";
export type { SettingsSegmentedProps } from "./primitives/SettingsSegmented";

export { SettingsColorPicker } from "./primitives/SettingsColorPicker";
export type { SettingsColorPickerProps } from "./primitives/SettingsColorPicker";

export { SettingsMultiSelect } from "./primitives/SettingsMultiSelect";
export type { SettingsMultiSelectProps } from "./primitives/SettingsMultiSelect";

export { SettingsButton } from "./primitives/SettingsButton";
export type { SettingsButtonProps } from "./primitives/SettingsButton";

export { SettingsLink } from "./primitives/SettingsLink";
export type { SettingsLinkProps } from "./primitives/SettingsLink";

export { SettingsKeybinding } from "./primitives/SettingsKeybinding";
export type {
  SettingsKeybindingProps,
  KeybindingValue,
} from "./primitives/SettingsKeybinding";

export { SettingsModelPicker } from "./primitives/SettingsModelPicker";
export type { SettingsModelPickerProps } from "./primitives/SettingsModelPicker";

// Layout primitives
export { SettingsSection } from "./layout/SettingsSection";
export type { SettingsSectionProps } from "./layout/SettingsSection";

export { SettingsSubHeader } from "./layout/SettingsSubHeader";
export type { SettingsSubHeaderProps } from "./layout/SettingsSubHeader";

export { SettingsCallout } from "./layout/SettingsCallout";
export type { SettingsCalloutProps } from "./layout/SettingsCallout";

export { SettingsGrid } from "./layout/SettingsGrid";
export type { SettingsGridProps } from "./layout/SettingsGrid";

export { SettingsReadOnlyValue } from "./layout/SettingsReadOnlyValue";
export type { SettingsReadOnlyValueProps } from "./layout/SettingsReadOnlyValue";
