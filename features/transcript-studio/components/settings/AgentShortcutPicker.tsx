"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAllShortcutsArray } from "@ai-matrx/chat/agents/redux/agent-shortcuts/selectors";
import { Select } from "@ai-matrx/design-system/controls";

interface AgentShortcutPickerProps {
  label: string;
  description?: string;
  /** Currently-selected shortcut id, or null when using the default. */
  value: string | null;
  /** Default shortcut id (shown as the first option). */
  defaultId: string;
  onChange: (next: string) => void;
}

export function AgentShortcutPicker({
  label,
  description,
  value,
  defaultId,
  onChange,
}: AgentShortcutPickerProps) {
  // Read all loaded shortcuts. The agent-shortcuts slice is hydrated by the
  // shell on first render of any agent surface; if the user hasn't visited
  // an agent surface yet, this can be empty — we handle that gracefully by
  // showing the current selection's id and letting the user paste / type.
  const shortcuts = useAppSelector(selectAllShortcutsArray);

  // Sort options: default first, then alphabetical by label.
  const options = useMemo(() => {
    const sorted = [...shortcuts].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    const def = sorted.find((s) => s.id === defaultId);
    const rest = sorted.filter((s) => s.id !== defaultId);
    return def ? [def, ...rest] : sorted;
  }, [shortcuts, defaultId]);

  const selectedId = value ?? defaultId;
  const hasSelectedInList = options.some((o) => o.id === selectedId);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      <Select
        value={selectedId}
        onValueChange={onChange}
        aria-label={label}
        className="w-full"
        options={[
          ...(!hasSelectedInList
            ? [
                {
                  value: selectedId,
                  label: `${selectedId.slice(0, 8)}… (not in registry)`,
                },
              ]
            : []),
          ...options.map((s) => ({
            value: s.id,
            label: `${s.id === defaultId ? "[default] " : ""}${s.label}`,
          })),
        ]}
      />
      {description && (
        <p className="text-[10px] text-muted-foreground/80">{description}</p>
      )}
    </div>
  );
}
