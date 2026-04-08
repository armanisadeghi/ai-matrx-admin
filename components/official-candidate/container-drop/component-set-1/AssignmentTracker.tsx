"use client";

import React from "react";
import { useContainerDropContext } from "../ContainerDropProvider";
import { resolveIcon, resolveColor } from "./presets";

interface AssignmentTrackerProps {
  title?: string;
  showUnassigned?: boolean;
  className?: string;
}

export function AssignmentTracker({
  title = "Assignment Tracker",
  showUnassigned = true,
  className,
}: AssignmentTrackerProps) {
  const { items, assignments, containers } = useContainerDropContext();

  const grouped: Record<string, typeof items> = {};
  if (showUnassigned) grouped.unassigned = [];
  containers.forEach((c) => (grouped[c.id] = []));

  items.forEach((item) => {
    const dest = assignments[item.id] ?? "unassigned";
    if (grouped[dest]) {
      grouped[dest] = [...grouped[dest], item];
    }
  });

  const columns = [
    ...(showUnassigned ? [{ id: "unassigned", label: "Unassigned" }] : []),
    ...containers,
  ];

  return (
    <div
      className={`rounded-lg border border-border bg-muted/30 p-4 ${className ?? ""}`}
    >
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            className="rounded-md border border-border bg-card p-2.5"
          >
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              {col.label}
            </div>
            {(grouped[col.id]?.length ?? 0) === 0 ? (
              <div className="text-xs text-muted-foreground/40">None</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {grouped[col.id].map((item) => {
                  const c = resolveColor(item.color as string);
                  const Icon = resolveIcon(item.iconName as string);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${c.bg}`}
                    >
                      <Icon className={`h-3 w-3 ${c.text}`} />
                      <span className={`text-xs ${c.text}`}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
