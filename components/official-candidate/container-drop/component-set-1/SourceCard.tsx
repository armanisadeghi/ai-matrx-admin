"use client";

import React from "react";
import { motion } from "motion/react";
import { GripVertical } from "lucide-react";
import { useContainerDropContext } from "../ContainerDropProvider";
import type { ContainerDropItem } from "../types";
import { resolveIcon, resolveColor } from "./presets";

interface SourceCardProps {
  item: ContainerDropItem;
  className?: string;
}

export function SourceCard({ item, className }: SourceCardProps) {
  const { startDrag, isDragging } = useContainerDropContext();
  const dragging = isDragging(item.id);
  const Icon = resolveIcon(item.iconName as string);
  const c = resolveColor(item.color as string);

  return (
    <motion.div
      layout
      layoutId={item.id}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: dragging ? 0.3 : 1, scale: dragging ? 0.95 : 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onPointerDown={(e) => startDrag(e, item, null)}
      className={`flex cursor-grab select-none items-center gap-3 rounded-lg border-2 bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${c.border} ${dragging ? "pointer-events-none" : ""} ${className ?? ""}`}
      style={{ touchAction: "none" }}
    >
      <div className={`rounded-full p-2 ${c.bg}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {item.label}
        </div>
        <div className="text-xs text-muted-foreground">Drag to assign</div>
      </div>
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </motion.div>
  );
}
