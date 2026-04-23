"use client";

import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "../SettingsRow";
import type { SettingsCommonProps } from "../types";

export type SettingsSwitchProps = SettingsCommonProps & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Controls whether the row renders a border underneath. */
  last?: boolean;
};

export function SettingsSwitch({
  checked,
  onCheckedChange,
  last,
  ...rowProps
}: SettingsSwitchProps) {
  const id =
    rowProps.id ??
    `settings-${rowProps.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <SettingsRow {...rowProps} id={id} variant="inline" last={last}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={rowProps.disabled}
      />
    </SettingsRow>
  );
}
