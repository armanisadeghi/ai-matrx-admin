"use client";

import React from "react";
import { GripVertical } from "lucide-react";
import type { ContainerDropItem, DragSnapshot } from "../types";
import { resolveIcon, resolveColor } from "./presets";

interface DragOverlayContentProps {
  item: ContainerDropItem;
  snapshot: DragSnapshot;
}

export function DragOverlayContent({
  item,
  snapshot,
}: DragOverlayContentProps) {
  const Icon = resolveIcon(item.iconName as string);
  const c = resolveColor(item.color as string);
  const isFromContainer = snapshot.originContainer !== null;

  if (isFromContainer) {
    return (
      <div
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 shadow-xl ${c.bg} ${c.border} opacity-90`}
      >
        <Icon className={`h-4 w-4 ${c.text}`} />
        <span className={`text-xs font-semibold ${c.text}`}>{item.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-[180px] items-center gap-3 rounded-lg border-2 bg-card px-4 py-3 shadow-2xl ${c.border} opacity-95`}
    >
      <div className={`rounded-full p-2 ${c.bg}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">
          {item.label}
        </div>
        <div className="text-xs text-muted-foreground">Drag to assign</div>
      </div>
      <GripVertical className="ml-auto h-4 w-4 text-muted-foreground/40" />
    </div>
  );
}
