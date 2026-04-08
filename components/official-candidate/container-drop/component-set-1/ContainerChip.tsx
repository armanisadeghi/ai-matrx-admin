"use client";

import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useContainerDropContext } from "../ContainerDropProvider";
import type { ContainerDropItem } from "../types";
import { resolveIcon, resolveColor } from "./presets";

interface ContainerChipProps {
  item: ContainerDropItem;
  containerId: string;
  className?: string;
}

export function ContainerChip({
  item,
  containerId,
  className,
}: ContainerChipProps) {
  const { startDrag, assign, isDragging } = useContainerDropContext();
  const dragging = isDragging(item.id);
  const Icon = resolveIcon(item.iconName as string);
  const c = resolveColor(item.color as string);

  return (
    <motion.div
      layout
      layoutId={item.id}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: dragging ? 0.3 : 1, scale: dragging ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onPointerDown={(e) => startDrag(e, item, containerId)}
      className={`group relative flex cursor-grab select-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${c.bg} ${c.border} ${dragging ? "pointer-events-none" : ""} ${className ?? ""}`}
      style={{ touchAction: "none" }}
    >
      <Icon className={`h-4 w-4 shrink-0 ${c.text}`} />
      <span className={`text-xs font-semibold whitespace-nowrap ${c.text}`}>
        {item.label}
      </span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          assign(item.id, null);
        }}
        className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 group-hover:opacity-100"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
