"use client";

/**
 * Lightweight hover preview for a single task, drawn by THE Peek. Reads from Redux directly —
 * no fetch — because tasks referenced in a message are essentially always
 * already loaded into the tasks slice.
 */

import { Peek, PeekHoverCard, type PeekRecord } from "@ai-matrx/design-system";
import { CheckSquare } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectTaskById, type TaskRecord } from "@/features/agent-context/redux/tasksSlice";
import { formatDate, peekLines } from "./peek-lines";

const DESCRIPTION_PREVIEW_CHARS = 400;

interface TaskPreviewContentProps {
  taskId: string;
  onOpen?: () => void;
  /** `surface` when this is the card itself (a hover), `bare` inside a panel that already frames it. */
  frame?: "surface" | "bare";
}

export function TaskPreviewContent({ taskId, onOpen, frame = "bare" }: TaskPreviewContentProps) {
  const task = useAppSelector(
    (state) => selectTaskById(state as Parameters<typeof selectTaskById>[0], taskId) as TaskRecord | undefined,
  );

  if (!task) {
    return <Peek frame={frame} record={{ kind: "Task", id: taskId, title: "Task not loaded", copyData: false }} />;
  }

  const description = task.description ?? "";
  const truncated =
    description.length > DESCRIPTION_PREVIEW_CHARS
      ? description.slice(0, DESCRIPTION_PREVIEW_CHARS).trimEnd() + "…"
      : description;
  const dueDate = formatDate(task.due_date);
  const lines = peekLines(truncated);

  const record: PeekRecord = {
    kind: "Task",
    id: taskId,
    title: task.title?.trim() || "Untitled task",
    glyph: CheckSquare,
    body: [
      ...(task.status ? [{ property: "Status", value: task.status }] : []),
      ...(task.priority ? [{ property: "Priority", value: task.priority }] : []),
      ...(dueDate ? [{ property: "Due", value: dueDate }] : []),
      ...(lines.length > 0 ? [{ section: "Description", items: lines }] : []),
    ],
    // The old Copy button copied the task's id.
    copyData: taskId,
    ...(onOpen ? { primary: { label: "Open", onSelect: onOpen } } : { href: `/tasks/${taskId}` }),
  };
  return <Peek frame={frame} record={record} />;
}

interface TaskHoverPreviewProps {
  taskId: string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  onOpen?: () => void;
  className?: string;
}

export function TaskHoverPreview({ taskId, children, side = "top", align = "start", onOpen }: TaskHoverPreviewProps) {
  return (
    <PeekHoverCard trigger={children} side={side} align={align} label="Task">
      <TaskPreviewContent taskId={taskId} onOpen={onOpen} frame="surface" />
    </PeekHoverCard>
  );
}
