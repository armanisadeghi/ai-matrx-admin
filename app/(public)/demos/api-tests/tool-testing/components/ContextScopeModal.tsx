'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Credenza,
  CredenzaTrigger,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
  CredenzaFooter,
  CredenzaClose,
} from '@/components/ui/credenza-modal/credenza';
import { Settings2, Loader2, X } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface ScopeOverride {
  organization_id?: string;
  project_id?: string;
  task_id?: string;
}

interface Organization {
  id: string;
  name: string;
  is_personal: boolean | null;
}

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string | null;
}

interface ContextScopeModalProps {
  scopeOverride: ScopeOverride;
  onScopeChange: (scope: ScopeOverride) => void;
}

export function ContextScopeModal({ scopeOverride, onScopeChange }: ContextScopeModalProps) {
  const [open, setOpen] = useState(false);

  // Local draft state (committed on Apply)
  const [draft, setDraft] = useState<ScopeOverride>(scopeOverride);

  // Data from DB
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Loading states
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Sync draft when external scope changes (e.g. after clear)
  useEffect(() => {
    setDraft(scopeOverride);
  }, [scopeOverride]);

  // ── Organizations ─────────────────────────────────────────────────────────
  // Query: org_members rows for current user, then deduplicate by org id.
  // organization_members has one row per (org, user) but the RLS policy allows
  // reading all rows (qual = true), so filter client-side by user_id via auth.
  // The supabase client uses the logged-in user's JWT, so `eq('user_id', ...)` 
  // requires us to get the current user first.
  const loadOrgs = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(id, name, is_personal)')
        .eq('user_id', user.id);

      if (!error && data) {
        // Each row is one org membership — deduplicate by org id in case of
        // multiple roles or data issues
        const seen = new Set<string>();
        const mapped: Organization[] = [];
        for (const row of data) {
          const org = Array.isArray(row.organizations)
            ? row.organizations[0]
            : (row.organizations as Record<string, unknown> | null);
          if (!org) continue;
          const id = org.id as string;
          if (seen.has(id)) continue;
          seen.add(id);
          mapped.push({
            id,
            name: org.name as string,
            is_personal: (org.is_personal as boolean | null) ?? null,
          });
        }
        setOrgs(mapped);
      }
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

  // ── Projects ──────────────────────────────────────────────────────────────
  // Projects are now scoped via project_members (RLS). Fetch via membership.
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch via project_members for RLS-safe access
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = (memberRows ?? []).map((r: { project_id: string }) => r.project_id);

      if (projectIds.length === 0) {
        // Fall back to created_by
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .eq('created_by', user.id)
          .order('name');
        if (!error && data) setProjects(data as Project[]);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds)
        .order('name');

      if (!error && data) {
        setProjects(data as Project[]);
      }
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  // Tasks have user_id (owner). RLS allows SELECT where user_id = auth.uid().
  // Load all user's tasks; when a project is selected, filter to that project.
  const loadTasks = useCallback(async (projectId?: string) => {
    setLoadingTasks(true);
    try {
      let query = supabase
        .from('tasks')
        .select('id, title, project_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setTasks(data as Task[]);
      }
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Load orgs + projects when modal opens
  useEffect(() => {
    if (!open) return;
    loadOrgs();
    loadProjects();
    loadTasks(draft.project_id);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload tasks when selected project changes
  useEffect(() => {
    if (!open) return;
    loadTasks(draft.project_id);
  }, [draft.project_id, open, loadTasks]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOrgChange = (value: string) => {
    const newOrgId = value === '__none__' ? undefined : value;
    // Cascade-clear project and task when org changes (projects now have organization_id)
    setDraft((prev) => ({ ...prev, organization_id: newOrgId, project_id: undefined, task_id: undefined }));
  };

  const handleProjectChange = (value: string) => {
    const newProjId = value === '__none__' ? undefined : value;
    // Clear task when project changes
    setDraft((prev) => ({ ...prev, project_id: newProjId, task_id: undefined }));
  };

  const handleTaskChange = (value: string) => {
    const newTaskId = value === '__none__' ? undefined : value;
    setDraft((prev) => ({ ...prev, task_id: newTaskId }));
  };

  const handleSave = () => {
    onScopeChange(draft);
    setOpen(false);
  };

  const handleClear = () => {
    const cleared: ScopeOverride = {};
    setDraft(cleared);
    onScopeChange(cleared);
    setOpen(false);
  };

  // Count committed scope fields for badge
  const activeScopeCount = [
    scopeOverride.organization_id,
    scopeOverride.project_id,
    scopeOverride.task_id,
  ].filter(Boolean).length;

  // Show names for the "current scope" preview
  const activeOrgName = orgs.find((o) => o.id === scopeOverride.organization_id)?.name;
  const activeProjName = projects.find((p) => p.id === scopeOverride.project_id)?.name;
  const activeTaskTitle = tasks.find((t) => t.id === scopeOverride.task_id)?.title;

  // Filtered tasks: if a project is chosen in draft, show only that project's tasks
  const visibleTasks = draft.project_id
    ? tasks.filter((t) => t.project_id === draft.project_id)
    : tasks;

  return (
    <Credenza open={open} onOpenChange={setOpen}>
      <CredenzaTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs px-2 gap-1 relative"
        >
          <Settings2 className="h-3 w-3" />
          Context
          {activeScopeCount > 0 && (
            <Badge
              variant="default"
              className="h-4 w-4 p-0 text-[9px] absolute -top-1 -right-1 flex items-center justify-center"
            >
              {activeScopeCount}
            </Badge>
          )}
        </Button>
      </CredenzaTrigger>

      <CredenzaContent className="sm:max-w-md">
        <CredenzaHeader>
          <CredenzaTitle>Test Context Scope</CredenzaTitle>
        </CredenzaHeader>

        <CredenzaBody className="space-y-4 py-4">
          <p className="text-xs text-muted-foreground">
            Optionally scope tool execution to a real org, project, or task. All data is
            fetched live using your authenticated session.
          </p>

          {/* ── Organization ── */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              Organization
              {loadingOrgs && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </label>
            <Select
              value={draft.organization_id ?? '__none__'}
              onValueChange={handleOrgChange}
              disabled={loadingOrgs}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None — no org scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                  None — no org scope
                </SelectItem>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id} className="text-xs">
                    {org.name}
                    {org.is_personal && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">(personal)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingOrgs && orgs.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No organizations found.</p>
            )}
          </div>

          {/* ── Project ── */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              Project
              {loadingProjects && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </label>
            <Select
              value={draft.project_id ?? '__none__'}
              onValueChange={handleProjectChange}
              disabled={loadingProjects}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None — no project scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                  None — no project scope
                </SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id} className="text-xs">
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingProjects && projects.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No projects found.</p>
            )}
          </div>

          {/* ── Task ── */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1">
              Task
              {loadingTasks && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </label>
            <Select
              value={draft.task_id ?? '__none__'}
              onValueChange={handleTaskChange}
              disabled={loadingTasks}
            >
              <SelectTrigger className="h-8 text-xs min-w-0">
                <SelectValue placeholder="None — no task scope" className="truncate" />
              </SelectTrigger>
              <SelectContent className="max-w-sm">
                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                  None — no task scope
                </SelectItem>
                {visibleTasks.map((task) => (
                  <SelectItem
                    key={task.id}
                    value={task.id}
                    className="text-xs whitespace-normal leading-snug py-2"
                  >
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingTasks && visibleTasks.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                {draft.project_id ? 'No tasks in this project.' : 'No tasks found.'}
              </p>
            )}
          </div>

          {/* ── Active scope preview ── */}
          {activeScopeCount > 0 && (
            <div className="rounded-md border border-border bg-muted/40 p-2 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Applied scope
              </p>
              {scopeOverride.organization_id && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-14 shrink-0">Org:</span>
                  <span className="text-[10px] font-medium text-foreground truncate">
                    {activeOrgName ?? scopeOverride.organization_id}
                  </span>
                </div>
              )}
              {scopeOverride.project_id && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-14 shrink-0">Project:</span>
                  <span className="text-[10px] font-medium text-foreground truncate">
                    {activeProjName ?? scopeOverride.project_id}
                  </span>
                </div>
              )}
              {scopeOverride.task_id && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-14 shrink-0">Task:</span>
                  <span className="text-[10px] font-medium text-foreground truncate">
                    {activeTaskTitle ?? scopeOverride.task_id}
                  </span>
                </div>
              )}
            </div>
          )}
        </CredenzaBody>

        <CredenzaFooter className="flex gap-2 justify-end pt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-7 text-xs gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear All
          </Button>
          <CredenzaClose asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              Cancel
            </Button>
          </CredenzaClose>
          <Button size="sm" onClick={handleSave} className="h-7 text-xs">
            Apply
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
