"use client";

import { useParams, useRouter } from "next/navigation";
import { useTaskContext } from "@/features/tasks/context/TaskContext";
import TaskDetailPage from "@/features/tasks/components/TaskDetailPage";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { getAllTasks, loading } = useTaskContext();

  const allTasks = getAllTasks();
  const task = allTasks.find((t) => t.id === taskId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Task not found
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
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
      </div>
    );
  }

  return <TaskDetailPage task={task} />;
}
