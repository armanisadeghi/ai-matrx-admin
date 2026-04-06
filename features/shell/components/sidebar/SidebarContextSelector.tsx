"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  FolderKanban,
  Layers,
  CheckSquare,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Globe,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import { requireUserId } from "@/utils/auth/getUserId";
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
  slug: string;
  is_personal: boolean;
  role: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  organization_id: string;
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

type TabKey = "tree" | "summary";

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, max = 24) {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}

function getRootWorkspaces(workspaces: WorkspaceItem[]): WorkspaceItem[] {
  return workspaces.filter((w) => !w.parent_workspace_id);
}

function getChildWorkspaces(
  workspaces: WorkspaceItem[],
  parentId: string,
): WorkspaceItem[] {
  return workspaces.filter((w) => w.parent_workspace_id === parentId);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SidebarContextSelector() {
  const dispatch = useAppDispatch();
  const ctx = useAppSelector(selectAppContext);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("tree");

  // Top-level orgs (fetched once on first open)
  const [orgs, setOrgs] = useState<OrgItem[] | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Per-org lazily loaded data: workspaces & direct projects
  const [orgWorkspaces, setOrgWorkspaces] = useState<
    Record<string, WorkspaceItem[]>
  >({});
  const [orgProjects, setOrgProjects] = useState<Record<string, ProjectItem[]>>(
    {},
  );
  const [loadingOrgData, setLoadingOrgData] = useState<Set<string>>(new Set());

  // Per-workspace lazily loaded projects
  const [wsProjects, setWsProjects] = useState<Record<string, ProjectItem[]>>(
    {},
  );
  const [loadingWsProjects, setLoadingWsProjects] = useState<Set<string>>(
    new Set(),
  );

  // Per-project lazily loaded tasks
  const [projectTasks, setProjectTasks] = useState<Record<string, TaskItem[]>>(
    {},
  );
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());

  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(
    new Set(),
  );
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [pos, setPos] = useState<{ x: number; top?: number; bottom?: number }>({
    x: 0,
  });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch orgs on first open (via membership — same as hierarchyService)
  const fetchOrgs = useCallback(async () => {
    if (orgs) return;
    setLoadingOrgs(true);
    try {
      const userId = requireUserId();
      const { data, error } = await supabase
        .from("organization_members")
        .select(
          "role, organizations!inner(id, name, slug, is_personal, created_at)",
        )
        .eq("user_id", userId);
      if (!error && data) {
        const mapped = data.map((row: Record<string, unknown>) => ({
          ...(row.organizations as Record<string, unknown>),
          role: row.role as string,
        })) as OrgItem[];
        mapped.sort((a, b) => a.name.localeCompare(b.name));
        setOrgs(mapped);
      }
    } finally {
      setLoadingOrgs(false);
    }
  }, [orgs]);

  // Fetch all workspaces + direct projects for an org (on expand)
  const fetchOrgData = useCallback(
    async (orgId: string) => {
      if (orgWorkspaces[orgId] || loadingOrgData.has(orgId)) return;
      setLoadingOrgData((s) => new Set(s).add(orgId));
      try {
        const [wsRes, projRes] = await Promise.all([
          supabase
            .from("workspaces")
            .select("id, organization_id, parent_workspace_id, name")
            .eq("organization_id", orgId)
            .order("name"),
          supabase
            .from("projects")
            .select("id, name, organization_id, workspace_id, is_personal")
            .eq("organization_id", orgId)
            .is("workspace_id", null)
            .order("name"),
        ]);
        setOrgWorkspaces((prev) => ({
          ...prev,
          [orgId]: (wsRes.data ?? []) as WorkspaceItem[],
        }));
        setOrgProjects((prev) => ({
          ...prev,
          [orgId]: (projRes.data ?? []) as ProjectItem[],
        }));
      } finally {
        setLoadingOrgData((s) => {
          const n = new Set(s);
          n.delete(orgId);
          return n;
        });
      }
    },
    [orgWorkspaces, loadingOrgData],
  );

  // Fetch projects for a workspace (on expand)
  const fetchWsProjects = useCallback(
    async (wsId: string) => {
      if (wsProjects[wsId] || loadingWsProjects.has(wsId)) return;
      setLoadingWsProjects((s) => new Set(s).add(wsId));
      try {
        const { data } = await supabase
          .from("projects")
          .select("id, name, organization_id, workspace_id, is_personal")
          .eq("workspace_id", wsId)
          .order("name");
        setWsProjects((prev) => ({
          ...prev,
          [wsId]: (data ?? []) as ProjectItem[],
        }));
      } finally {
        setLoadingWsProjects((s) => {
          const n = new Set(s);
          n.delete(wsId);
          return n;
        });
      }
    },
    [wsProjects, loadingWsProjects],
  );

  // Fetch tasks for a project (on expand)
  const fetchTasks = useCallback(
    async (projectId: string) => {
      if (projectTasks[projectId] || loadingTasks.has(projectId)) return;
      setLoadingTasks((s) => new Set(s).add(projectId));
      try {
        const { data } = await supabase
          .from("tasks")
          .select("id, title, project_id, status")
          .eq("project_id", projectId)
          .is("parent_task_id", null)
          .order("created_at", { ascending: false })
          .limit(50);
        setProjectTasks((prev) => ({
          ...prev,
          [projectId]: (data ?? []) as TaskItem[],
        }));
      } finally {
        setLoadingTasks((s) => {
          const n = new Set(s);
          n.delete(projectId);
          return n;
        });
      }
    },
    [projectTasks, loadingTasks],
  );

  const MENU_HEIGHT = 480;
  const VIEWPORT_PADDING = 8;

  const handleToggle = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const x = r.right + 8;
      const spaceBelow = window.innerHeight - r.top;
      const spaceAbove = r.bottom;

      if (spaceBelow >= MENU_HEIGHT + VIEWPORT_PADDING) {
        setPos({ x, top: Math.max(VIEWPORT_PADDING, r.top) });
      } else if (spaceAbove >= MENU_HEIGHT + VIEWPORT_PADDING) {
        setPos({ x, bottom: window.innerHeight - r.bottom });
      } else {
        setPos({ x, top: VIEWPORT_PADDING });
      }
    }
    if (!open) fetchOrgs();
    setOpen((v) => !v);
  }, [open, fetchOrgs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-expand to show current selection when panel opens
  useEffect(() => {
    if (!orgs || !open) return;
    if (ctx.organization_id) {
      setExpandedOrgs((s) => new Set(s).add(ctx.organization_id!));
      fetchOrgData(ctx.organization_id);
    }
    if (ctx.workspace_id) {
      setExpandedWorkspaces((s) => new Set(s).add(ctx.workspace_id!));
      fetchWsProjects(ctx.workspace_id);
    }
    if (ctx.project_id) {
      setExpandedProjects((s) => new Set(s).add(ctx.project_id!));
      fetchTasks(ctx.project_id);
    }
  }, [orgs, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOrg = (id: string) => {
    const willExpand = !expandedOrgs.has(id);
    setExpandedOrgs((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    if (willExpand) fetchOrgData(id);
  };

  const toggleWorkspace = (id: string) => {
    const willExpand = !expandedWorkspaces.has(id);
    setExpandedWorkspaces((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    if (willExpand) fetchWsProjects(id);
  };

  const toggleProject = (id: string) => {
    const willExpand = !expandedProjects.has(id);
    setExpandedProjects((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    if (willExpand) fetchTasks(id);
  };

  // Display label for the trigger button
  const displayLabel = ctx.organization_name
    ? ctx.project_name
      ? truncate(ctx.project_name, 14)
      : ctx.workspace_name
        ? truncate(ctx.workspace_name, 14)
        : truncate(ctx.organization_name, 14)
    : "Context";

  const hasContext = !!(
    ctx.organization_id ||
    ctx.workspace_id ||
    ctx.project_id ||
    ctx.task_id
  );

  // Render a workspace node with its children (nested workspaces + projects)
  const renderWorkspaceNode = (
    ws: WorkspaceItem,
    allWorkspaces: WorkspaceItem[],
    depth: number,
  ) => {
    const isExpanded = expandedWorkspaces.has(ws.id);
    const isSelected = ctx.workspace_id === ws.id;
    const childWorkspaces = getChildWorkspaces(allWorkspaces, ws.id);
    const childProjs = wsProjects[ws.id] ?? [];
    const isLoadingProjs = loadingWsProjects.has(ws.id);
    const hasLoadedProjs = ws.id in wsProjects;

    return (
      <div key={ws.id}>
        <TreeRow
          depth={depth}
          icon={<Layers className="w-3.5 h-3.5" />}
          label={ws.name}
          isSelected={isSelected}
          isExpanded={isExpanded}
          hasChildren
          onToggle={() => toggleWorkspace(ws.id)}
          onSelect={() => {
            dispatch(setWorkspace({ id: ws.id, name: ws.name }));
          }}
        />
        {isExpanded && (
          <>
            {childWorkspaces.map((cw) =>
              renderWorkspaceNode(cw, allWorkspaces, depth + 1),
            )}
            {isLoadingProjs ? (
              <LoadingRow depth={depth + 1} label="Loading projects..." />
            ) : (
              <>
                {childProjs.map((proj) => renderProjectNode(proj, depth + 1))}
                {hasLoadedProjs &&
                  childWorkspaces.length === 0 &&
                  childProjs.length === 0 && (
                    <EmptyRow depth={depth + 1} label="Empty" />
                  )}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const renderProjectNode = (proj: ProjectItem, depth: number) => {
    const isExpanded = expandedProjects.has(proj.id);
    const isSelected = ctx.project_id === proj.id;
    const tasks = projectTasks[proj.id] ?? [];
    const isLoadingProjTasks = loadingTasks.has(proj.id);
    const hasLoadedTasks = proj.id in projectTasks;

    return (
      <div key={proj.id}>
        <TreeRow
          depth={depth}
          icon={<FolderKanban className="w-3.5 h-3.5" />}
          label={proj.name}
          isSelected={isSelected}
          isExpanded={isExpanded}
          hasChildren
          onToggle={() => toggleProject(proj.id)}
          onSelect={() => {
            dispatch(setProject({ id: proj.id, name: proj.name }));
          }}
        />
        {isExpanded && (
          <div>
            {isLoadingProjTasks ? (
              <LoadingRow depth={depth + 1} label="Loading tasks..." />
            ) : (
              <>
                {tasks.map((task) => (
                  <TreeRow
                    key={task.id}
                    depth={depth + 1}
                    icon={<CheckSquare className="w-3.5 h-3.5" />}
                    label={task.title}
                    sublabel={task.status ?? undefined}
                    isSelected={ctx.task_id === task.id}
                    onSelect={() => {
                      dispatch(setTask({ id: task.id, name: task.title }));
                      setOpen(false);
                    }}
                  />
                ))}
                {hasLoadedTasks && tasks.length === 0 && (
                  <EmptyRow depth={depth + 1} label="No tasks" />
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "shell-nav-item shell-tactile",
          (open || hasContext) && "shell-nav-item-active",
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Set working context"
        title="Context"
      >
        <span className="shell-nav-icon">
          <Globe size={18} strokeWidth={1.75} />
        </span>
        <span className="shell-nav-label flex items-center gap-1">
          {displayLabel}
          {hasContext && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
        </span>
      </button>

      {/* Menu portal */}
      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[10000] flex flex-col",
              "w-[300px] max-h-[480px] rounded-xl overflow-hidden",
              "bg-card/97 backdrop-blur-xl border border-border shadow-2xl",
              "py-1 text-sm",
            )}
            style={{
              left: pos.x,
              ...(pos.top !== undefined ? { top: pos.top } : {}),
              ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
            }}
          >
            {/* Tab header */}
            <div className="flex items-center px-2 py-1 mb-1 border-b border-border/50 gap-1">
              <button
                type="button"
                className={cn(
                  "px-2 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md transition-colors",
                  activeTab === "tree"
                    ? "bg-accent/80 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                )}
                onClick={() => setActiveTab("tree")}
              >
                Browse
              </button>
              <button
                type="button"
                className={cn(
                  "px-2 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md transition-colors",
                  activeTab === "summary"
                    ? "bg-accent/80 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                )}
                onClick={() => setActiveTab("summary")}
              >
                Active
              </button>
              <div className="flex-1" />
              {hasContext && (
                <button
                  type="button"
                  onClick={() => dispatch(clearContext())}
                  className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Clear all context"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Tree tab */}
            {activeTab === "tree" && (
              <div className="flex-1 overflow-y-auto min-h-0">
                {loadingOrgs ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : orgs ? (
                  <div className="py-1">
                    {orgs.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-muted-foreground/50 italic">
                        No organizations found
                      </div>
                    ) : (
                      orgs.map((org) => {
                        const isExpanded = expandedOrgs.has(org.id);
                        const isSelected = ctx.organization_id === org.id;
                        const isLoadingData = loadingOrgData.has(org.id);
                        const workspaces = orgWorkspaces[org.id] ?? [];
                        const directProjects = orgProjects[org.id] ?? [];
                        const hasLoadedData = org.id in orgWorkspaces;

                        return (
                          <div key={org.id}>
                            <TreeRow
                              depth={0}
                              icon={<Building2 className="w-3.5 h-3.5" />}
                              label={org.name}
                              sublabel={org.is_personal ? "Personal" : org.role}
                              isSelected={isSelected}
                              isExpanded={isExpanded}
                              hasChildren
                              onToggle={() => toggleOrg(org.id)}
                              onSelect={() => {
                                dispatch(
                                  setOrganization({
                                    id: org.id,
                                    name: org.name,
                                  }),
                                );
                              }}
                            />
                            {isExpanded && (
                              <>
                                {isLoadingData ? (
                                  <LoadingRow depth={1} label="Loading..." />
                                ) : (
                                  <>
                                    {getRootWorkspaces(workspaces).map((ws) =>
                                      renderWorkspaceNode(ws, workspaces, 1),
                                    )}
                                    {directProjects.map((proj) =>
                                      renderProjectNode(proj, 1),
                                    )}
                                    {hasLoadedData &&
                                      workspaces.length === 0 &&
                                      directProjects.length === 0 && (
                                        <EmptyRow
                                          depth={1}
                                          label="No workspaces or projects"
                                        />
                                      )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Summary / Active tab */}
            {activeTab === "summary" && (
              <div className="flex-1 overflow-y-auto min-h-0">
                {hasContext ? (
                  <div className="py-2 px-3 space-y-2">
                    <ContextSummaryBlock ctx={ctx} />
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-muted-foreground/50 italic">
                    No context selected
                    <p className="mt-1 text-[10px]">
                      Use the Browse tab to set your working context
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ── Tree row ─────────────────────────────────────────────────────────────────

function TreeRow({
  depth,
  icon,
  label,
  sublabel,
  isSelected,
  isExpanded,
  hasChildren,
  onToggle,
  onSelect,
}: {
  depth: number;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  isSelected: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 py-1 pr-2 transition-colors group",
        isSelected
          ? "bg-primary/8 text-foreground"
          : "text-foreground/80 hover:bg-accent/60",
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {/* Expand/collapse toggle */}
      {hasChildren ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {/* Icon */}
      <span
        className={cn(
          "shrink-0 transition-colors",
          isSelected
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {icon}
      </span>

      {/* Label — click to select */}
      <button
        type="button"
        className="flex-1 min-w-0 text-left"
        onClick={onSelect}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{label}</span>
          {sublabel && (
            <span className="text-[9px] text-muted-foreground/60 capitalize shrink-0">
              {sublabel}
            </span>
          )}
        </span>
      </button>

      {/* Selected indicator */}
      {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
    </div>
  );
}

// ── Inline helpers ───────────────────────────────────────────────────────────

function LoadingRow({ depth, label }: { depth: number; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 py-1 text-muted-foreground"
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
    >
      <Loader2 className="w-3 h-3 animate-spin" />
      <span className="text-[10px]">{label}</span>
    </div>
  );
}

function EmptyRow({ depth, label }: { depth: number; label: string }) {
  return (
    <div
      className="text-[10px] text-muted-foreground/50 italic py-0.5"
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
    >
      {label}
    </div>
  );
}

// ── Context summary ──────────────────────────────────────────────────────────

function ContextSummaryBlock({
  ctx,
}: {
  ctx: ReturnType<typeof selectAppContext>;
}) {
  const dispatch = useAppDispatch();

  const items: {
    level: string;
    name: string | null;
    icon: React.ReactNode;
    onClear: () => void;
  }[] = [];

  if (ctx.organization_id) {
    items.push({
      level: "Organization",
      name: ctx.organization_name,
      icon: <Building2 className="w-3.5 h-3.5" />,
      onClear: () => dispatch(setOrganization({ id: null })),
    });
  }
  if (ctx.workspace_id) {
    items.push({
      level: "Workspace",
      name: ctx.workspace_name,
      icon: <Layers className="w-3.5 h-3.5" />,
      onClear: () => dispatch(setWorkspace({ id: null })),
    });
  }
  if (ctx.project_id) {
    items.push({
      level: "Project",
      name: ctx.project_name,
      icon: <FolderKanban className="w-3.5 h-3.5" />,
      onClear: () => dispatch(setProject({ id: null })),
    });
  }
  if (ctx.task_id) {
    items.push({
      level: "Task",
      name: ctx.task_name,
      icon: <CheckSquare className="w-3.5 h-3.5" />,
      onClear: () => dispatch(setTask({ id: null })),
    });
  }

  return (
    <div className="space-y-1.5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 flex-wrap">
        {items.map((item, i) => (
          <span key={item.level} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {item.name ? truncate(item.name, 18) : item.level}
            </span>
          </span>
        ))}
      </div>

      {/* Detailed rows */}
      {items.map((item) => (
        <div
          key={item.level}
          className="flex items-center gap-2 p-2 rounded-lg bg-accent/30"
        >
          <span className="text-primary shrink-0">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              {item.level}
            </div>
            <div className="text-xs font-medium truncate">
              {item.name ?? "Unknown"}
            </div>
          </div>
          <button
            type="button"
            onClick={item.onClear}
            className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
            title={`Clear ${item.level.toLowerCase()}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Clear all */}
      <button
        type="button"
        onClick={() => dispatch(clearContext())}
        className="w-full text-center py-1.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/5"
      >
        Clear all context
      </button>
    </div>
  );
}
