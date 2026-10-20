"use client";

// Every surface that shows or edits ONE task, rendered live on the same task so
// they can be compared before any is retired (Arman, 2026-10-20: "I need to see
// all of the window panels that control that thing in one place"). Each card
// names the component, whether it is its own code or the shared body, and the
// exact places in the app that mount it (traced from imports on 2026-10-20).

import { useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import { selectAllTasksFlat } from "@/features/tasks/redux/selectors";
import { Badge, Button, Select } from "@ai-matrx/design-system/controls";
import TaskEditor from "@/features/tasks/components/TaskEditor";
import TaskDetailsPanel from "@/features/tasks/components/TaskDetailsPanel";
import TaskDetails from "@/features/tasks/components/TaskDetails";
import MobileTaskDetails from "@/features/tasks/components/mobile/MobileTaskDetails";
import { useOpenTaskEditorWindow } from "@/features/overlays/definitions/taskEditorWindow.overlay";
import { useOpenTaskQuickCreateWindow } from "@/features/overlays/definitions/taskQuickCreateWindow.overlay";
import { useOpenUtilitiesOverlay } from "@/features/overlays/definitions/quickUtilities.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import { setQuickTasksSelectedTaskId } from "@/features/tasks/redux/quickTasksWindowSlice";

function SurfaceCard({
  name,
  code,
  separate,
  usedIn,
  actions,
  children,
  width,
}: {
  name: string;
  code: string;
  separate: boolean;
  usedIn: string[];
  actions?: ReactNode;
  children?: ReactNode;
  width?: number;
}) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="space-y-1.5 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {name}
          </h2>
          <Badge tone={separate ? "warning" : "success"}>
            {separate ? "Separate code" : "Shared body"}
          </Badge>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">{code}</p>
        <ul className="space-y-0.5 text-xs text-foreground">
          {usedIn.map((u) => (
            <li key={u}>• {u}</li>
          ))}
        </ul>
        {actions && <div className="flex flex-wrap gap-1.5 pt-1">{actions}</div>}
      </header>
      {children && (
        <div className="h-[720px] min-h-0 overflow-auto bg-background">
          <div style={width ? { width } : undefined} className="h-full">
            {children}
          </div>
        </div>
      )}
    </section>
  );
}

export default function TaskSurfaceCompare() {
  useNavTree();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllTasksFlat);
  const [taskId, setTaskId] = useState<string | null>(null);
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0] ?? null;
  const openTaskWindow = useOpenTaskEditorWindow();
  const openQuickCreate = useOpenTaskQuickCreateWindow();
  const openUtilities = useOpenUtilitiesOverlay();

  const openQuickTasks = () => {
    if (task) dispatch(setQuickTasksSelectedTaskId(task.id));
    dispatch(openOverlay({ overlayId: "quickTasksWindow" }));
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold text-foreground">
          Task surfaces
        </h1>
        <div className="w-96 max-w-full">
          <Select
            aria-label="Task to show"
            value={task?.id ?? ""}
            onValueChange={setTaskId}
            options={tasks.slice(0, 300).map((t) => ({
              value: t.id,
              label: `${t.title || "Untitled"}${t.projectName ? ` · ${t.projectName}` : ""}`,
            }))}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          4 bodies show one task · 3 windows
        </span>
      </div>

      {!task ? (
        <p className="text-sm text-muted-foreground">Reading tasks…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          <SurfaceCard
            name="1 · Task editor (main)"
            code="TaskEditor → TaskEditorBody"
            separate={false}
            usedIn={[
              "Floating task window (click any task chip or subtask)",
              "/tasks — right pane on desktop",
              "/tasks/<id> full page",
              "War Room task tiles",
              "Board task items",
              "Chat: task tool result + task context",
            ]}
            actions={
              <Button
                variant="outline"
                onClick={() => openTaskWindow({ taskId: task.id })}
              >
                Open as window
              </Button>
            }
          >
            <TaskEditor key={task.id} taskId={task.id} embedded />
          </SurfaceCard>

          <SurfaceCard
            name="2 · Task details panel (older)"
            code="TaskDetailsPanel"
            separate
            usedIn={[
              "Quick Tasks window (bell → Tasks; quick-create → Open in window)",
              "Quick Tasks canvas view",
              "Utilities Hub (user menu) → Tasks tab",
            ]}
            actions={
              <>
                <Button variant="outline" onClick={openQuickTasks}>
                  Open Quick Tasks window
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openUtilities({ initialTab: "tasks" })}
                >
                  Open Utilities → Tasks
                </Button>
              </>
            }
          >
            <TaskDetailsPanel key={task.id} task={task} onClose={() => {}} />
          </SurfaceCard>

          <SurfaceCard
            name="3 · Mobile task details"
            code="MobileTaskDetails"
            separate
            usedIn={["/tasks on a phone (under 768px wide)"]}
            width={390}
          >
            <MobileTaskDetails key={task.id} task={task} onBack={() => {}} />
          </SurfaceCard>

          <SurfaceCard
            name="4 · Inline list-row details"
            code="TaskDetails (inside TaskItem / TaskList)"
            separate
            usedIn={["No live screen found — TaskList is imported nowhere"]}
          >
            <TaskDetails key={task.id} task={task} />
          </SurfaceCard>

          <SurfaceCard
            name="Quick create window"
            code="TaskQuickCreateWindow"
            separate
            usedIn={[
              "New-task shortcut and “Create task” buttons (War Room, Marketing pages, HR people menu)",
            ]}
            actions={
              <Button variant="outline" onClick={() => openQuickCreate({})}>
                Open quick create
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
