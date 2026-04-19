"use client";

import React, { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchTasksForEntity,
  selectTasksForEntity,
  selectTasksForEntityLoading,
} from "@/features/tasks/redux";
import TaskChip from "./TaskChip";
import AssociateTaskButton from "./AssociateTaskButton";
import { cn } from "@/utils/cn";

interface TaskChipRowProps {
  entityType: string;
  entityId: string;
  /** Optional preview/label used when the user clicks the inline "+" to attach */
  label?: string;
  /** Whether to render the inline "+" add button inside the row. Default true. */
  showAddButton?: boolean;
  /** Hide the row entirely when there are zero chips + no add button. Default false. */
  hideIfEmpty?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * Inline row of task chips representing every task linked to this entity.
 * Auto-fetches the reverse-lookup on mount (idempotent — cached per entity).
 *
 * Drop under a message, note, or file to surface its task links at a glance.
 */
export default function TaskChipRow({
  entityType,
  entityId,
  label,
  showAddButton = true,
  hideIfEmpty = false,
  size = "sm",
  className,
}: TaskChipRowProps) {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectTasksForEntity(entityType, entityId));
  const isLoading = useAppSelector(
    selectTasksForEntityLoading(entityType, entityId),
  );
  const fetchedRef = useRef<string>("");

  useEffect(() => {
    const key = `${entityType}:${entityId}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    dispatch(fetchTasksForEntity({ entityType, entityId }));
  }, [dispatch, entityType, entityId]);

  if (hideIfEmpty && tasks.length === 0 && !showAddButton) return null;
  if (tasks.length === 0 && !showAddButton && !isLoading) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      data-task-chip-row
    >
      {tasks.map((t) => (
        <TaskChip
          key={t.association_id}
          taskId={t.task_id}
          source={{ entity_type: entityType, entity_id: entityId }}
          size={size}
        />
      ))}
      {showAddButton && (
        <AssociateTaskButton
          entityType={entityType}
          entityId={entityId}
          label={label}
          variant="icon"
          size={size === "xs" ? "sm" : size}
          label_text="Add task link"
        />
      )}
    </div>
  );
}
