"use client";

import React from "react";
import { AnimatePresence } from "motion/react";
import { useContainerDropContext } from "../ContainerDropProvider";
import { SourceCard } from "./SourceCard";
import { AddItemForm } from "./AddItemForm";

interface SourceTrayProps {
  showAddForm?: boolean;
  addButtonLabel?: string;
  title?: string;
  emptyText?: string;
  className?: string;
  /** Grid columns class override (default: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3") */
  gridClassName?: string;
  children?: React.ReactNode;
}

export function SourceTray({
  showAddForm = false,
  addButtonLabel,
  title = "Available Items",
  emptyText = "All items have been assigned. Add more above or remove from containers below.",
  className,
  gridClassName,
  children,
}: SourceTrayProps) {
  const { getUnassigned } = useContainerDropContext();
  const unassigned = getUnassigned();

  return (
    <div
      className={`mb-6 rounded-lg border border-border bg-card p-4 ${className ?? ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({unassigned.length})
          </span>
        </h2>
      </div>

      {showAddForm && (
        <div className="mb-3">
          <AddItemForm buttonLabel={addButtonLabel} />
        </div>
      )}

      <div
        className={`grid gap-2 ${gridClassName ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        <AnimatePresence mode="popLayout">
          {unassigned.map((item) => (
            <SourceCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>

      {unassigned.length === 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground/50">
          {emptyText}
        </div>
      )}

      {children}
    </div>
  );
}
