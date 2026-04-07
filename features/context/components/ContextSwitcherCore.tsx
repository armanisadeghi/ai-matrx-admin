"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  FolderKanban,
  Layers,
  CheckSquare,
  ChevronRight,
  Loader2,
  User,
  Globe,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAppContext,
  setOrganization,
  setWorkspace,
  setProject,
  setTask,
  clearContext,
} from "@/features/context/redux/appContextSlice";
import { useNavTree } from "@/features/context/hooks/useNavTree";

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  title: string;
  project_id: string;
  status: string | null;
}

// ── Helper ───────────────────────────────────────────────────────────────────

function truncate(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContextSwitcherCore() {
  const dispatch = useAppDispatch();
  const ctx = useAppSelector(selectAppContext);

  // ── Redux-backed nav tree ────────────────────────────────────────────────
  const {
    orgs,
    flatWorkspaces,
    flatProjects,
    isLoading: loadingTree,
    isError,
    error,
  } = useNavTree();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "org" | "workspace" | "project" | "task"
  >("org");

  // ── Fetch tasks when project is selected ────────────────────────────────
  useEffect(() => {
    if (!ctx.project_id) {
      setTasks([]);
      return;
    }
    setLoadingTasks(true);
    supabase
      .from("tasks")
      .select("id, title, project_id, status")
      .eq("project_id", ctx.project_id)
      .is("parent_task_id", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.error("[ContextSwitcherCore] fetchTasks error:", fetchErr);
        }
        setTasks((data ?? []) as TaskItem[]);
        setLoadingTasks(false);
      });
  }, [ctx.project_id]);

  const hasContext =
    ctx.organization_id || ctx.workspace_id || ctx.project_id || ctx.task_id;

  // ── Filtered lists based on current context ─────────────────────────────
  const visibleWorkspaces = ctx.organization_id
    ? flatWorkspaces.filter((w) => w.org_id === ctx.organization_id)
    : flatWorkspaces;

  const visibleProjects = ctx.workspace_id
    ? flatProjects.filter((p) => p.workspace_id === ctx.workspace_id)
    : ctx.organization_id
      ? flatProjects.filter((p) => p.org_id === ctx.organization_id)
      : flatProjects;

  // ── Section tabs ─────────────────────────────────────────────────────────
  const tabs: {
    key: typeof activeSection;
    icon: typeof Building2;
    label: string;
  }[] = [
    { key: "org", icon: Building2, label: "Org" },
    { key: "workspace", icon: Layers, label: "Workspace" },
    { key: "project", icon: FolderKanban, label: "Project" },
    { key: "task", icon: CheckSquare, label: "Task" },
  ];

  return (
    <div className="flex flex-col h-full bg-background min-h-0">
      {/* Section tabs */}
      <div className="flex shrink-0 border-b border-border bg-card">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors cursor-pointer [&_svg]:w-4 [&_svg]:h-4 relative",
              activeSection === key
                ? "text-primary bg-accent/30"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
            )}
          >
            <Icon />
            {label}
            {activeSection === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loadingTree ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 h-full text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading Context...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 h-full text-destructive/70">
            <AlertCircle className="w-6 h-6" />
            <span className="text-sm font-medium">Failed to load</span>
            {error && (
              <span className="text-xs text-muted-foreground">{error}</span>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Org section */}
            {activeSection === "org" && (
              <>
                <SectionRow
                  label="Personal (no org)"
                  icon={<User className="w-4 h-4" />}
                  active={!ctx.organization_id}
                  onClick={() => dispatch(setOrganization({ id: null }))}
                />
                {orgs.map((org) => (
                  <SectionRow
                    key={org.id}
                    label={org.name}
                    sublabel={org.is_personal ? "Personal org" : org.role}
                    icon={<Building2 className="w-4 h-4" />}
                    active={ctx.organization_id === org.id}
                    onClick={() => {
                      dispatch(setOrganization({ id: org.id, name: org.name }));
                      setActiveSection("workspace");
                    }}
                  />
                ))}
                {orgs.length === 0 && (
                  <EmptyState label="No organizations found." />
                )}
              </>
            )}

            {/* Workspace section */}
            {activeSection === "workspace" && (
              <>
                <SectionRow
                  label="No workspace"
                  icon={<Globe className="w-4 h-4 opacity-40" />}
                  active={!ctx.workspace_id}
                  onClick={() => dispatch(setWorkspace({ id: null }))}
                />
                {visibleWorkspaces.map((ws) => (
                  <SectionRow
                    key={ws.id}
                    label={ws.name}
                    icon={<Layers className="w-4 h-4" />}
                    active={ctx.workspace_id === ws.id}
                    onClick={() => {
                      dispatch(setWorkspace({ id: ws.id, name: ws.name }));
                      setActiveSection("project");
                    }}
                  />
                ))}
                {visibleWorkspaces.length === 0 && (
                  <EmptyState
                    label={
                      ctx.organization_id
                        ? "No workspaces in this org"
                        : "No workspaces"
                    }
                  />
                )}
              </>
            )}

            {/* Project section */}
            {activeSection === "project" && (
              <>
                <SectionRow
                  label="No project"
                  icon={<Globe className="w-4 h-4 opacity-40" />}
                  active={!ctx.project_id}
                  onClick={() => dispatch(setProject({ id: null }))}
                />
                {visibleProjects.map((proj) => (
                  <SectionRow
                    key={proj.id}
                    label={proj.name}
                    icon={<FolderKanban className="w-4 h-4" />}
                    active={ctx.project_id === proj.id}
                    onClick={() => {
                      dispatch(setProject({ id: proj.id, name: proj.name }));
                      setActiveSection("task");
                    }}
                  />
                ))}
                {visibleProjects.length === 0 && (
                  <EmptyState label="No projects available" />
                )}
              </>
            )}

            {/* Task section */}
            {activeSection === "task" && (
              <>
                {!ctx.project_id ? (
                  <EmptyState label="Please select a project first to view tasks." />
                ) : loadingTasks ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10 h-full text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm font-medium">
                      Loading Tasks...
                    </span>
                  </div>
                ) : (
                  <>
                    <SectionRow
                      label="No task"
                      icon={<Globe className="w-4 h-4 opacity-40" />}
                      active={!ctx.task_id}
                      onClick={() => dispatch(setTask({ id: null }))}
                    />
                    {tasks.map((task) => (
                      <SectionRow
                        key={task.id}
                        label={task.title}
                        sublabel={task.status ?? undefined}
                        icon={<CheckSquare className="w-4 h-4" />}
                        active={ctx.task_id === task.id}
                        onClick={() => {
                          dispatch(setTask({ id: task.id, name: task.title }));
                        }}
                      />
                    ))}
                    {tasks.length === 0 && (
                      <EmptyState label="No tasks found in this project." />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Active context summary footer */}
      <div className="shrink-0 p-3 bg-muted/20 border-t border-border flex flex-col items-center justify-center min-h-[48px]">
        {hasContext ? (
          <div className="w-full flex items-center justify-between">
            <ContextBreadcrumb
              ctx={ctx}
              orgs={orgs}
              flatWorkspaces={flatWorkspaces}
              flatProjects={flatProjects}
              tasks={tasks}
            />
            <button
              onClick={() => dispatch(clearContext())}
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
              title="Clear all context"
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground italic">
            No context selected
          </span>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionRow({
  label,
  sublabel,
  icon,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-2.5 rounded-md text-left transition-all cursor-pointer group",
        active
          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
          : "bg-background text-foreground border border-transparent shadow-none hover:bg-accent hover:border-border",
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm font-medium truncate">{label}</span>
        {sublabel && (
          <span className="text-[0.6875rem] text-muted-foreground truncate capitalize pt-0.5">
            {sublabel}
          </span>
        )}
      </span>
      {active && <ChevronRight className="w-4 h-4 shrink-0 opacity-80" />}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-4 py-8 flex flex-col items-center justify-center text-sm font-medium text-muted-foreground/60 italic bg-muted/10 rounded-md border border-dashed border-border mt-2">
      {label}
    </div>
  );
}

function ContextBreadcrumb({
  ctx,
  orgs,
  flatWorkspaces,
  flatProjects,
  tasks,
}: {
  ctx: ReturnType<typeof selectAppContext>;
  orgs: { id: string; name: string }[];
  flatWorkspaces: { id: string; name: string }[];
  flatProjects: { id: string; name: string }[];
  tasks: TaskItem[];
}) {
  const parts: string[] = [];
  if (ctx.organization_id) {
    const o = orgs.find((o) => o.id === ctx.organization_id);
    if (o) parts.push(truncate(o.name, 14));
  }
  if (ctx.workspace_id) {
    const w = flatWorkspaces.find((w) => w.id === ctx.workspace_id);
    if (w) parts.push(truncate(w.name, 14));
  }
  if (ctx.project_id) {
    const p = flatProjects.find((p) => p.id === ctx.project_id);
    if (p) parts.push(truncate(p.name, 14));
  }
  if (ctx.task_id) {
    const t = tasks.find((t) => t.id === ctx.task_id);
    if (t) parts.push(truncate(t.title, 14));
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          )}
          <span className="text-xs font-medium text-foreground/80">{part}</span>
        </span>
      ))}
    </div>
  );
}
