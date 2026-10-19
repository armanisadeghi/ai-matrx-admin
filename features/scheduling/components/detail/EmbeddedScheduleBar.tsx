"use client";

// The schedule page's header, for a board tile: View / Edit and the record's actions in one bar.
// The page draws the same list as `EntityModeHeader` actions; the tile has no shell header, so the
// SAME action list (built once by `ScheduleDetail`) renders here as buttons.

import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import type { AgendaTask } from "../../types";

export interface ScheduleBarAction {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  primary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}

type Mode = "view" | "edit";

export function EmbeddedScheduleBar({
  task,
  editing,
  onEditing,
  isSystemTask,
  actions,
}: {
  task: AgendaTask;
  editing: boolean;
  onEditing: (editing: boolean) => void;
  /** A platform system job has no user editor: Edit lives in the System jobs console. */
  isSystemTask: boolean;
  actions: readonly ScheduleBarAction[];
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2" data-schedule-bar={task.id}>
      {isSystemTask ? null : (
        <SegmentedControl<Mode>
          aria-label="Schedule view"
          value={editing ? "edit" : "view"}
          onValueChange={(next) => onEditing(next === "edit")}
          data={[
            { value: "view", label: "View" },
            { value: "edit", label: "Edit" },
          ]}
        />
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            type="button"
            variant={a.primary ? "primary" : a.destructive ? "danger" : "outline"}
            icon={<a.icon />}
            onClick={a.onPress}
            disabled={a.disabled}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
