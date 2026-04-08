"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useContainerDropContext } from "../ContainerDropProvider";
import { ContainerChip } from "./ContainerChip";

interface DropZoneProps {
  containerId: string;
  /** Override the label from the container definition */
  label?: string;
  emptyText?: string;
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({
  containerId,
  label,
  emptyText,
  className,
  children,
}: DropZoneProps) {
  const { containers, getContainerItems, hoverContainerId, registerContainer } =
    useContainerDropContext();

  const containerDef = containers.find((c) => c.id === containerId);
  const displayLabel = label ?? containerDef?.label ?? containerId;
  const items = getContainerItems(containerId);
  const isOver = hoverContainerId === containerId;

  return (
    <div
      ref={registerContainer(containerId)}
      className={`relative flex min-h-[160px] flex-col rounded-lg border-2 border-dashed bg-muted/30 p-3 transition-all duration-200 ${
        isOver
          ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
          : "border-border"
      } ${className ?? ""}`}
    >
      <div className="mb-2 text-sm font-semibold text-foreground">
        {displayLabel}
      </div>

      {items.length === 0 && !isOver && (
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/60">
          {emptyText ?? "Drop items here"}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <ContainerChip
              key={item.id}
              item={item}
              containerId={containerId}
            />
          ))}
        </AnimatePresence>
      </div>

      {children}

      {isOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary/30"
        />
      )}
    </div>
  );
}
