'use client';

import { supabase } from '@/utils/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────

export type HierarchyOrg = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_personal: boolean | null;
  settings: Record<string, unknown> | null;
  role: string;
  created_at: string | null;
};

export type HierarchyWorkspace = {
  id: string;
  organization_id: string;
  parent_workspace_id: string | null;
  name: string;
  description: string | null;
  settings: Record<string, unknown> | null;
  created_at: string | null;
};

export type HierarchyProject = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  organization_id: string | null;
  workspace_id: string | null;
  is_personal: boolean | null;
  settings: Record<string, unknown> | null;
  created_at: string | null;
  created_by: string | null;
};

export type HierarchyTask = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  assignee_id: string | null;
  settings: Record<string, unknown> | null;
  created_at: string | null;
  user_id: string | null;
};

// ─── Tree node ──────────────────────────────────────────────────────

export type HierarchyNodeType = 'user' | 'organization' | 'workspace' | 'project' | 'task';

export type HierarchyNode = {
  id: string;
  type: HierarchyNodeType;
  name: string;
  description: string | null;
  parentId: string | null;
  children: HierarchyNode[];
  childCount: number;
  meta?: Record<string, unknown>;
};

// ─── Service ────────────────────────────────────────────────────────

export const hierarchyService = {

  // ─── Current user info ──────────────────────────────────────────
  async fetchCurrentUser(): Promise<{ id: string; email: string; name: string | null } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('user_id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? '',
      name: (profile as any)?.display_name ?? (profile as any)?.full_name ?? user.email ?? 'Me',
    };
  },

  // ─── Organizations the current user belongs to ──────────────────
  async fetchUserOrganizations(): Promise<HierarchyOrg[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organizations!inner (
          id, name, slug, description, logo_url, is_personal, settings, created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
      ...row.organizations,
      role: row.role,
    }));
  },

  // ─── Workspaces for an organization ─────────────────────────────
  async fetchOrgWorkspaces(orgId: string): Promise<HierarchyWorkspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, organization_id, parent_workspace_id, name, description, settings, created_at')
      .eq('organization_id', orgId)
      .order('name');

    if (error) throw error;
    return (data ?? []) as HierarchyWorkspace[];
  },

  // ─── Projects ───────────────────────────────────────────────────
  async fetchProjects(opts: { workspaceId?: string; orgId?: string }): Promise<HierarchyProject[]> {
    let query = supabase
      .from('projects')
      .select('id, name, slug, description, organization_id, workspace_id, is_personal, settings, created_at, created_by')
      .order('name');

    if (opts.workspaceId) {
      query = query.eq('workspace_id', opts.workspaceId);
    } else if (opts.orgId) {
      query = query.eq('organization_id', opts.orgId).is('workspace_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as HierarchyProject[];
  },

  // Fetch all projects for current user (including unassigned)
  async fetchAllUserProjects(): Promise<HierarchyProject[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, slug, description, organization_id, workspace_id, is_personal, settings, created_at, created_by')
      .eq('created_by', user.id)
      .order('name');

    if (error) throw error;
    return (data ?? []) as HierarchyProject[];
  },

  // ─── Tasks for a project ────────────────────────────────────────
  async fetchProjectTasks(projectId: string): Promise<HierarchyTask[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, project_id, parent_task_id, status, priority, due_date, assignee_id, settings, created_at, user_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as HierarchyTask[];
  },

  // Fetch tasks not linked to any project
  async fetchOrphanTasks(): Promise<HierarchyTask[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, project_id, parent_task_id, status, priority, due_date, assignee_id, settings, created_at, user_id')
      .is('project_id', null)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as HierarchyTask[];
  },

  // ─── Build task tree from flat list ─────────────────────────────
  _buildTaskNodes(tasks: HierarchyTask[]): HierarchyNode[] {
    const taskMap = new Map<string, HierarchyNode>();
    for (const task of tasks) {
      taskMap.set(task.id, {
        id: task.id,
        type: 'task',
        name: task.title,
        description: task.description,
        parentId: task.parent_task_id ?? task.project_id ?? null,
        children: [],
        childCount: 0,
        meta: { status: task.status, priority: task.priority, due_date: task.due_date, created_at: task.created_at },
      });
    }
    const roots: HierarchyNode[] = [];
    for (const task of tasks) {
      const node = taskMap.get(task.id)!;
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        const parent = taskMap.get(task.parent_task_id)!;
        parent.children.push(node);
        parent.childCount++;
      } else {
        roots.push(node);
      }
    }
    return roots;
  },

  // ─── Full tree from user root ───────────────────────────────────
  async fetchFullTree(): Promise<HierarchyNode[]> {
    const user = await this.fetchCurrentUser();
    if (!user) return [];

    const orgs = await this.fetchUserOrganizations();
    const allProjects = await this.fetchAllUserProjects();
    const orphanTasks = await this.fetchOrphanTasks();

    // Track which project IDs are accounted for in the org tree
    const assignedProjectIds = new Set<string>();

    const orgNodes: HierarchyNode[] = [];

    for (const org of orgs) {
      const orgNode: HierarchyNode = {
        id: org.id,
        type: 'organization',
        name: org.name,
        description: org.description,
        parentId: 'user-root',
        children: [],
        childCount: 0,
        meta: { slug: org.slug, is_personal: org.is_personal, role: org.role, created_at: org.created_at },
      };

      // Fetch workspaces
      const workspaces = await this.fetchOrgWorkspaces(org.id);
      const wsMap = new Map<string, HierarchyNode>();

      for (const ws of workspaces) {
        wsMap.set(ws.id, {
          id: ws.id,
          type: 'workspace',
          name: ws.name,
          description: ws.description,
          parentId: ws.parent_workspace_id ?? org.id,
          children: [],
          childCount: 0,
          meta: { created_at: ws.created_at },
        });
      }

      // Nest child workspaces
      for (const ws of workspaces) {
        const node = wsMap.get(ws.id)!;
        if (ws.parent_workspace_id && wsMap.has(ws.parent_workspace_id)) {
          const parent = wsMap.get(ws.parent_workspace_id)!;
          parent.children.push(node);
          parent.childCount++;
        } else {
          orgNode.children.push(node);
          orgNode.childCount++;
        }
      }

      // Projects under workspaces
      for (const ws of workspaces) {
        const projects = await this.fetchProjects({ workspaceId: ws.id });
        const wsNode = wsMap.get(ws.id)!;
        for (const proj of projects) {
          assignedProjectIds.add(proj.id);
          const tasks = await this.fetchProjectTasks(proj.id);
          const taskNodes = this._buildTaskNodes(tasks);
          wsNode.children.push({
            id: proj.id,
            type: 'project',
            name: proj.name,
            description: proj.description,
            parentId: ws.id,
            children: taskNodes,
            childCount: taskNodes.length,
            meta: { slug: proj.slug, created_at: proj.created_at },
          });
          wsNode.childCount++;
        }
      }

      // Projects directly under org (no workspace)
      const orgProjects = await this.fetchProjects({ orgId: org.id });
      for (const proj of orgProjects) {
        assignedProjectIds.add(proj.id);
        const tasks = await this.fetchProjectTasks(proj.id);
        const taskNodes = this._buildTaskNodes(tasks);
        orgNode.children.push({
          id: proj.id,
          type: 'project',
          name: proj.name,
          description: proj.description,
          parentId: org.id,
          children: taskNodes,
          childCount: taskNodes.length,
          meta: { slug: proj.slug, created_at: proj.created_at },
        });
        orgNode.childCount++;
      }

      orgNodes.push(orgNode);
    }

    // Now handle unassigned projects (no org, no workspace)
    const unassignedProjects = allProjects.filter(p => !assignedProjectIds.has(p.id));
    const unassignedProjectNodes: HierarchyNode[] = [];
    for (const proj of unassignedProjects) {
      const tasks = await this.fetchProjectTasks(proj.id);
      const taskNodes = this._buildTaskNodes(tasks);
      unassignedProjectNodes.push({
        id: proj.id,
        type: 'project',
        name: proj.name,
        description: proj.description,
        parentId: 'user-root',
        children: taskNodes,
        childCount: taskNodes.length,
        meta: { slug: proj.slug, created_at: proj.created_at, unassigned: true },
      });
    }

    // Orphan tasks (no project)
    const orphanTaskNodes = this._buildTaskNodes(orphanTasks);

    // Build user root
    const userRoot: HierarchyNode = {
      id: 'user-root',
      type: 'user',
      name: user.name ?? user.email,
      description: user.email,
      parentId: null,
      children: [
        ...orgNodes,
        ...(unassignedProjectNodes.length > 0 ? [{
          id: 'unassigned-projects',
          type: 'project' as HierarchyNodeType,
          name: `Unassigned Projects (${unassignedProjectNodes.length})`,
          description: 'Projects not linked to any organization or workspace',
          parentId: 'user-root',
          children: unassignedProjectNodes,
          childCount: unassignedProjectNodes.length,
          meta: { virtual: true },
        }] : []),
        ...(orphanTaskNodes.length > 0 ? [{
          id: 'orphan-tasks',
          type: 'task' as HierarchyNodeType,
          name: `Standalone Tasks (${orphanTaskNodes.length})`,
          description: 'Tasks not linked to any project',
          parentId: 'user-root',
          children: orphanTaskNodes,
          childCount: orphanTaskNodes.length,
          meta: { virtual: true },
        }] : []),
      ],
      childCount: 0,
      meta: { email: user.email },
    };
    userRoot.childCount = userRoot.children.length;

    return [userRoot];
  },

  // ─── Create entity ──────────────────────────────────────────────
  async createOrganization(data: { name: string; slug: string; description?: string }): Promise<HierarchyOrg> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ ...data, created_by: user.id })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
    });

    return { ...org, role: 'owner' } as HierarchyOrg;
  },

  async createWorkspace(data: {
    name: string;
    organization_id: string;
    parent_workspace_id?: string;
    description?: string;
  }): Promise<HierarchyWorkspace> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: ws, error } = await supabase
      .from('workspaces')
      .insert({ ...data, created_by: user.id })
      .select()
      .single();
    if (error) throw error;
    return ws as HierarchyWorkspace;
  },

  async createProject(data: {
    name: string;
    organization_id?: string;
    workspace_id?: string;
    description?: string;
  }): Promise<HierarchyProject> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: proj, error } = await supabase
      .from('projects')
      .insert({ ...data, created_by: user.id })
      .select()
      .single();
    if (error) throw error;
    return proj as HierarchyProject;
  },

  async createTask(data: {
    title: string;
    project_id: string;
    parent_task_id?: string;
    description?: string;
    status?: string;
    priority?: string;
  }): Promise<HierarchyTask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...data,
        status: data.status ?? 'not_started',
        user_id: user.id,
        settings: {},
      })
      .select()
      .single();
    if (error) throw error;
    return task as HierarchyTask;
  },

  // ─── Update entity ─────────────────────────────────────────────
  async updateOrganization(id: string, data: { name?: string; description?: string }): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },

  async updateWorkspace(id: string, data: { name?: string; description?: string; parent_workspace_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },

  async updateProject(id: string, data: { name?: string; description?: string; organization_id?: string | null; workspace_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },

  async updateTask(id: string, data: { title?: string; description?: string; status?: string; priority?: string; due_date?: string | null; project_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },

  // ─── Delete entity ──────────────────────────────────────────────
  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteProject(id: string): Promise<void> {
    // Deletes project and cascades to tasks via FK constraint
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteWorkspace(id: string): Promise<void> {
    // Delete child workspaces first (nested), then this workspace
    const { data: children } = await supabase
      .from('workspaces')
      .select('id')
      .eq('parent_workspace_id', id);
    for (const child of children ?? []) {
      await this.deleteWorkspace(child.id);
    }
    const { error } = await supabase.from('workspaces').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteOrganization(id: string): Promise<void> {
    // Delete workspaces first, then org members, then org
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('organization_id', id)
      .is('parent_workspace_id', null);
    for (const ws of workspaces ?? []) {
      await this.deleteWorkspace(ws.id);
    }
    // Delete org projects (no workspace)
    const { error: projErr } = await supabase
      .from('projects')
      .delete()
      .eq('organization_id', id)
      .is('workspace_id', null);
    if (projErr) throw projErr;
    // Delete members
    const { error: memErr } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', id);
    if (memErr) throw memErr;
    // Delete org
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Move / reparent ──────────────────────────────────────────────
  async moveProject(projectId: string, target: { organization_id?: string | null; workspace_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update(target)
      .eq('id', projectId);
    if (error) throw error;
  },

  async moveTask(taskId: string, target: { project_id?: string | null; parent_task_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update(target)
      .eq('id', taskId);
    if (error) throw error;
  },

  async moveWorkspace(workspaceId: string, target: { organization_id?: string; parent_workspace_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .update(target)
      .eq('id', workspaceId);
    if (error) throw error;
  },

  // ─── Resolve entity name by type + id (for breadcrumbs) ─────────
  async resolveEntityName(type: HierarchyNodeType, id: string): Promise<string | null> {
    if (type === 'user') return null;
    const table = type === 'organization' ? 'organizations'
      : type === 'workspace' ? 'workspaces'
      : type === 'project' ? 'projects'
      : 'tasks';
    const nameCol = type === 'task' ? 'title' : 'name';

    const { data, error } = await supabase.from(table).select(nameCol).eq('id', id).single();
    if (error) return null;
    return (data as any)?.[nameCol] ?? null;
  },

  // ─── Resolve ancestor chain for breadcrumbs ─────────────────────
  async resolveAncestors(type: HierarchyNodeType, id: string): Promise<Array<{ type: HierarchyNodeType; id: string; name: string }>> {
    const chain: Array<{ type: HierarchyNodeType; id: string; name: string }> = [];

    if (type === 'task') {
      const { data: task } = await supabase.from('tasks').select('title, project_id').eq('id', id).single();
      if (task) {
        chain.unshift({ type: 'task', id, name: task.title });
        if (task.project_id) {
          const parents = await this.resolveAncestors('project', task.project_id);
          chain.unshift(...parents);
        }
      }
    } else if (type === 'project') {
      const { data: proj } = await supabase.from('projects').select('name, workspace_id, organization_id').eq('id', id).single();
      if (proj) {
        chain.unshift({ type: 'project', id, name: proj.name });
        if (proj.workspace_id) {
          const parents = await this.resolveAncestors('workspace', proj.workspace_id);
          chain.unshift(...parents);
        } else if (proj.organization_id) {
          const parents = await this.resolveAncestors('organization', proj.organization_id);
          chain.unshift(...parents);
        }
      }
    } else if (type === 'workspace') {
      const { data: ws } = await supabase.from('workspaces').select('name, organization_id, parent_workspace_id').eq('id', id).single();
      if (ws) {
        chain.unshift({ type: 'workspace', id, name: ws.name });
        if (ws.parent_workspace_id) {
          const parents = await this.resolveAncestors('workspace', ws.parent_workspace_id);
          chain.unshift(...parents);
        } else if (ws.organization_id) {
          const parents = await this.resolveAncestors('organization', ws.organization_id);
          chain.unshift(...parents);
        }
      }
    } else if (type === 'organization') {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', id).single();
      if (org) {
        chain.unshift({ type: 'organization', id, name: org.name });
      }
    }

    return chain;
  },
};
