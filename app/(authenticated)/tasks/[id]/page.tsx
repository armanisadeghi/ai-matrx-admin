"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectSelectedTaskId,
  selectTasksLoading,
  setSelectedTaskId,
} from "@/features/tasks/redux/taskUiSlice";
import { selectTaskById } from "@/features/agent-context/redux/tasksSlice";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import TaskEditor from "@/features/tasks/components/TaskEditor";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const dispatch = useAppDispatch();

  // Shared, idempotent hierarchy hydration
  useNavTree();

  const selectedId = useAppSelector(selectSelectedTaskId);
  const task = useAppSelector((s) => selectTaskById(s, taskId));
  const loading = useAppSelector(selectTasksLoading);

  // Sync route param → selected task in Redux so TaskEditor renders it
  useEffect(() => {
    if (selectedId !== taskId) {
      dispatch(setSelectedTaskId(taskId));
    }
  }, [dispatch, selectedId, taskId]);

  if (!task && loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          Task not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The task{" "}
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {taskId}
          </code>{" "}
          could not be found.
        </p>
        <Button asChild variant="outline">
          <Link href="/tasks">
            <ArrowLeft size={16} className="mr-2" />
            Back to Tasks
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-page flex flex-col min-h-0">
      <div className="shrink-0 px-4 py-2 border-b border-border/50 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-7">
          <Link href="/tasks">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Link>
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <TaskEditor />
      </div>
    </div>
  );
}
