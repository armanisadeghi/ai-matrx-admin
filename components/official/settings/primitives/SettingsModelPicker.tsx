"use client";

import { Loader2 } from "lucide-react";
import { SettingsRow } from "../SettingsRow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModels } from "@/features/ai-models/hooks/useModels";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/redux/store";
import type { SettingsCommonProps } from "../types";

type Scope = "all" | "active" | "inactive";

export type SettingsModelPickerProps = SettingsCommonProps & {
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Which subset of models to show.
   * - "active": only models the user has marked active (default)
   * - "inactive": only inactive models
   * - "all": every model
   */
  scope?: Scope;
  placeholder?: string;
  last?: boolean;
};

/**
 * Shared model-selection row. Wraps the AI-models registry so every settings
 * surface renders model pickers identically (no divergence across tabs).
 */
export function SettingsModelPicker({
  value,
  onValueChange,
  scope = "active",
  placeholder,
  last,
  ...rowProps
}: SettingsModelPickerProps) {
  const id =
    rowProps.id ??
    `settings-${rowProps.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const { models, isLoading } = useModels();
  const activeIds = useSelector(
    (state: RootState) => state.userPreferences.aiModels.activeModels,
  );
  const activeSet = new Set(activeIds);

  const filtered = models.filter((m) => {
    if (scope === "active") return activeSet.has(m.id);
    if (scope === "inactive") return !activeSet.has(m.id);
    return true;
  });

  return (
    <SettingsRow {...rowProps} id={id} variant="inline" last={last}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : filtered.length === 0 ? (
        <span className="text-xs text-amber-500">
          No {scope === "active" ? "active" : ""} models
        </span>
      ) : (
        <Select
          value={value}
          onValueChange={onValueChange}
          disabled={rowProps.disabled}
        >
          <SelectTrigger id={id} size="default" className="w-56">
            <SelectValue placeholder={placeholder ?? "Choose a model"} />
          </SelectTrigger>
          <SelectContent>
            {filtered.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.common_name || m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </SettingsRow>
  );
}
