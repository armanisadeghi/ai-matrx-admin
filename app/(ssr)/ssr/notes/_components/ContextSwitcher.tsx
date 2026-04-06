"use client";

// ContextSwitcher — hierarchical workspace context picker for the notes sidebar.
//
// Opens as a popover anchored to a bottom-bar button.
// Fetches org / workspace / project tree lazily on first open via
// `agx_get_user_context_tree` RPC — zero cost until the user engages.
// Tasks are fetched on-demand when a project is selected.
//
// Dispatches to appContextSlice: setOrganization, setWorkspace, setProject, setTask.
// The slice cascades resets downward so narrowing org clears workspace/project/task.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  FolderKanban,
  Layers,
  CheckSquare,
  ChevronRight,
  X,
  Loader2,
  User,
  Globe,
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
} from "@/lib/redux/slices/appContextSlice";

// ── Types ────────────────────────────────────────────────────────────────────

interface OrgItem {
  id: string;
  name: string;
  slug: string | null;
  is_personal: boolean;
  role: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  organization_id: string | null;
  parent_workspace_id: string | null;
}

interface ProjectItem {
  id: string;
  name: string;
  organization_id: string | null;
  workspace_id: string | null;
  is_personal: boolean;
}

interface TaskItem {
  id: string;
  title: string;
  project_id: string;
  status: string | null;
}

interface ContextTree {
  organizations: OrgItem[];
  workspaces: WorkspaceItem[];
  projects: ProjectItem[];
}

// ── Helper ───────────────────────────────────────────────────────────────────

function truncate(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ContextSwitcher() {
  const dispatch = useAppDispatch();
  const ctx = useAppSelector(selectAppContext);

  const [open, setOpen] = useState(false);
  const [tree, setTree] = useState<ContextTree | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "org" | "workspace" | "project" | "task"
  >("org");

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // ── Fetch tree lazily on first open ─────────────────────────────────────
  const fetchTree = useCallback(async () => {
    if (tree) return;
    setLoadingTree(true);
    try {
      const { data, error } = await supabase.rpc("agx_get_user_context_tree");
      if (!error && data) {
        setTree(data as unknown as ContextTree);
      }
    } finally {
      setLoadingTree(false);
    }
  }, [tree]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    fetchTree();
  }, [fetchTree]);

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
      .then(({ data }) => {
        setTasks((data ?? []) as TaskItem[]);
        setLoadingTasks(false);
      });
  }, [ctx.project_id]);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Derived display label ────────────────────────────────────────────────
  const activeLabel = (() => {
    if (ctx.task_id && tasks.length > 0) {
      const t = tasks.find((t) => t.id === ctx.task_id);
      return t ? truncate(t.title) : "Task set";
    }
    if (ctx.project_id && tree) {
      const p = tree.projects.find((p) => p.id === ctx.project_id);
      return p ? truncate(p.name) : "Project set";
    }
    if (ctx.workspace_id && tree) {
      const w = tree.workspaces.find((w) => w.id === ctx.workspace_id);
      return w ? truncate(w.name) : "Workspace set";
    }
    if (ctx.organization_id && tree) {
      const o = tree.organizations.find((o) => o.id === ctx.organization_id);
      return o ? truncate(o.name) : "Org set";
    }
    return "Set context";
  })();

  const hasContext =
    ctx.organization_id || ctx.workspace_id || ctx.project_id || ctx.task_id;

  // ── Filtered lists based on current context ─────────────────────────────
  const visibleWorkspaces = tree
    ? ctx.organization_id
      ? tree.workspaces.filter((w) => w.organization_id === ctx.organization_id)
      : tree.workspaces
    : [];

  const visibleProjects = tree
    ? ctx.workspace_id
      ? tree.projects.filter((p) => p.workspace_id === ctx.workspace_id)
      : ctx.organization_id
        ? tree.projects.filter((p) => p.organization_id === ctx.organization_id)
        : tree.projects
    : [];

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
    <div className="relative">
      {/* ── Trigger button ───────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        onClick={open ? () => setOpen(false) : handleOpen}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1 text-[0.6875rem] rounded-md cursor-pointer transition-colors [&_svg]:w-3 [&_svg]:h-3",
          hasContext
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        )}
      >
        <Globe />
        <span className="flex-1 text-left truncate">{activeLabel}</span>
        {hasContext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch(clearContext());
            }}
            className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Clear context"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-full left-0 mb-1.5 w-64 rounded-lg border border-border bg-popover shadow-elevation-2 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <span className="text-xs font-medium text-foreground">
              Working context
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex border-b border-border/50">
            {tabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[0.6rem] font-medium transition-colors cursor-pointer [&_svg]:w-3 [&_svg]:h-3",
                  activeSection === key
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-h-56 overflow-y-auto">
            {loadingTree ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : (
              <>
                {/* Org section */}
                {activeSection === "org" && (
                  <div className="py-1">
                    <SectionRow
                      label="Personal (no org)"
                      icon={<User className="w-3.5 h-3.5" />}
                      active={!ctx.organization_id}
                      onClick={() => dispatch(setOrganization({ id: null }))}
                    />
                    {(tree?.organizations ?? []).map((org) => (
                      <SectionRow
                        key={org.id}
                        label={org.name}
                        sublabel={org.is_personal ? "Personal org" : org.role}
                        icon={<Building2 className="w-3.5 h-3.5" />}
                        active={ctx.organization_id === org.id}
                        onClick={() => {
                          dispatch(
                            setOrganization({ id: org.id, name: org.name }),
                          );
                          setActiveSection("workspace");
                        }}
                      />
                    ))}
                    {tree && tree.organizations.length === 0 && (
                      <EmptyState label="No organizations" />
                    )}
                  </div>
                )}

                {/* Workspace section */}
                {activeSection === "workspace" && (
                  <div className="py-1">
                    <SectionRow
                      label="No workspace"
                      icon={<Globe className="w-3.5 h-3.5 opacity-40" />}
                      active={!ctx.workspace_id}
                      onClick={() => dispatch(setWorkspace({ id: null }))}
                    />
                    {visibleWorkspaces.map((ws) => (
                      <SectionRow
                        key={ws.id}
                        label={ws.name}
                        icon={<Layers className="w-3.5 h-3.5" />}
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
                  </div>
                )}

                {/* Project section */}
                {activeSection === "project" && (
                  <div className="py-1">
                    <SectionRow
                      label="No project"
                      icon={<Globe className="w-3.5 h-3.5 opacity-40" />}
                      active={!ctx.project_id}
                      onClick={() => dispatch(setProject({ id: null }))}
                    />
                    {visibleProjects.map((proj) => (
                      <SectionRow
                        key={proj.id}
                        label={proj.name}
                        icon={<FolderKanban className="w-3.5 h-3.5" />}
                        active={ctx.project_id === proj.id}
                        onClick={() => {
                          dispatch(
                            setProject({ id: proj.id, name: proj.name }),
                          );
                          setActiveSection("task");
                        }}
                      />
                    ))}
                    {visibleProjects.length === 0 && (
                      <EmptyState label="No projects available" />
                    )}
                  </div>
                )}

                {/* Task section */}
                {activeSection === "task" && (
                  <div className="py-1">
                    {!ctx.project_id ? (
                      <EmptyState label="Select a project first" />
                    ) : loadingTasks ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-xs">Loading tasks…</span>
                      </div>
                    ) : (
                      <>
                        <SectionRow
                          label="No task"
                          icon={<Globe className="w-3.5 h-3.5 opacity-40" />}
                          active={!ctx.task_id}
                          onClick={() => dispatch(setTask({ id: null }))}
                        />
                        {tasks.map((task) => (
                          <SectionRow
                            key={task.id}
                            label={task.title}
                            sublabel={task.status ?? undefined}
                            icon={<CheckSquare className="w-3.5 h-3.5" />}
                            active={ctx.task_id === task.id}
                            onClick={() => {
                              dispatch(
                                setTask({ id: task.id, name: task.title }),
                              );
                              setOpen(false);
                            }}
                          />
                        ))}
                        {tasks.length === 0 && (
                          <EmptyState label="No tasks in this project" />
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Active context summary */}
          {hasContext && (
            <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
              <ContextBreadcrumb ctx={ctx} tree={tree} tasks={tasks} />
            </div>
          )}
        </div>
      )}
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
        "flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors cursor-pointer group",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-accent/60",
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
      <span className="flex-1 min-w-0">
        <span className="block text-xs truncate">{label}</span>
        {sublabel && (
          <span className="block text-[0.625rem] text-muted-foreground truncate capitalize">
            {sublabel}
          </span>
        )}
      </span>
      {active && <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-3 py-4 text-center text-[0.6875rem] text-muted-foreground/60 italic">
      {label}
    </div>
  );
}

function ContextBreadcrumb({
  ctx,
  tree,
  tasks,
}: {
  ctx: ReturnType<typeof selectAppContext>;
  tree: ContextTree | null;
  tasks: TaskItem[];
}) {
  const parts: string[] = [];
  if (ctx.organization_id && tree) {
    const o = tree.organizations.find((o) => o.id === ctx.organization_id);
    if (o) parts.push(truncate(o.name, 16));
  }
  if (ctx.workspace_id && tree) {
    const w = tree.workspaces.find((w) => w.id === ctx.workspace_id);
    if (w) parts.push(truncate(w.name, 16));
  }
  if (ctx.project_id && tree) {
    const p = tree.projects.find((p) => p.id === ctx.project_id);
    if (p) parts.push(truncate(p.name, 16));
  }
  if (ctx.task_id) {
    const t = tasks.find((t) => t.id === ctx.task_id);
    if (t) parts.push(truncate(t.title, 16));
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
          )}
          <span className="text-[0.625rem] text-muted-foreground">{part}</span>
        </span>
      ))}
    </div>
  );
}
