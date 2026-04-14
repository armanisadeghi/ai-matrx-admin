import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import LightSwitchToggle from "@/components/matrx/LightSwitchToggle";

interface ToggleInputProps {
  value: string;
  onChange: (value: string) => void;
  offLabel?: string;
  onLabel?: string;
  variableName: string;
  compact?: boolean;
  wizardMode?: boolean;
  threeDMode?: boolean;
  containerWidth?: number;
}

/**
 * Toggle Input - Returns text value based on toggle state
 */
export function ToggleInput({
  value,
  onChange,
  offLabel = "No",
  onLabel = "Yes",
  variableName,
  compact = false,
  wizardMode = false,
  threeDMode = false,
  containerWidth = 0,
}: ToggleInputProps) {
  const isOn = value === onLabel;

  const handleToggle = (checked: boolean) => {
    onChange(checked ? onLabel : offLabel);
  };

  return threeDMode ? (
    <div className="flex items-center justify-center pb-4">
      <LightSwitchToggle
        value={isOn}
        onChange={(checked) => handleToggle(checked)}
        labels={{ on: onLabel, off: offLabel }}
        variant="rounded"
        width="w-64"
        height="h-12"
      />
    </div>
  ) : (
    <div
      className={
        compact
          ? "flex items-center justify-between p-2 bg-transparent rounded border-border"
          : "flex items-center justify-between p-4 bg-transparent rounded-lg border-border"
      }
    >
      <div className={compact ? "" : "space-y-1"}>
        <Label
          className={compact ? "text-xs font-medium" : "text-sm font-medium"}
        >
          {offLabel} / {onLabel}
        </Label>
        {!compact && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Currently:{" "}
            <span className="font-medium">{isOn ? onLabel : offLabel}</span>
          </p>
        )}
      </div>
      <Switch checked={isOn} onCheckedChange={handleToggle} />
    </div>
  );
}
