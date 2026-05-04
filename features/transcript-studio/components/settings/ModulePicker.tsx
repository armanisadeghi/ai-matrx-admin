"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { listModules } from "../../modules/registry";
import type { ModuleId } from "../../types";

interface ModulePickerProps {
  value: ModuleId;
  onChange: (next: ModuleId) => void;
}

export function ModulePicker({ value, onChange }: ModulePickerProps) {
  const modules = useMemo(() => listModules(), []);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-foreground">
        Column 4 module
      </label>
      <div className="grid grid-cols-1 gap-1.5">
        {modules.length === 0 && (
          <p className="text-[10px] text-muted-foreground/80">
            No modules registered. Add one at{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              features/transcript-studio/modules/
            </code>
            .
          </p>
        )}
        {modules.map((m) => {
          const Icon = m.icon;
          const isActive = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={cn(
                "flex items-start gap-2 rounded-md border p-2 text-left transition-colors",
                isActive
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/50 hover:bg-accent/40",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0 mt-0.5",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[11px] font-medium leading-tight">
                  {m.label}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground/80">
                  {m.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        Switching mid-session preserves prior items — they stay tagged with
        their original module and reappear if you toggle “Show prior modules”.
      </p>
    </div>
  );
}
