'use client';

import { useState, useCallback, useEffect } from 'react';
import { Building2, Users, FolderKanban, ListTodo, Calendar } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCreateOrganization,
  useCreateWorkspace,
  useCreateProject,
  useCreateTask,
  useUpdateEntity,
} from '../hooks/useHierarchy';
import type { HierarchyNode, HierarchyNodeType } from '../service/hierarchyService';

const ICONS: Record<HierarchyNodeType, React.ComponentType<{ className?: string }>> = {
  user: Building2,
  organization: Building2,
  workspace: Users,
  project: FolderKanban,
  task: ListTodo,
};

const LABELS: Record<HierarchyNodeType, string> = {
  user: 'Personal',
  organization: 'Organization',
  workspace: 'Workspace',
  project: 'Project',
  task: 'Task',
};

const TASK_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TASK_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

type Props = {
  entityType: HierarchyNodeType;
  mode?: 'create' | 'edit';
  existingNode?: HierarchyNode;
  parentId?: string;
  parentType?: HierarchyNodeType;
  orgId?: string;
  onClose: () => void;
};

export function HierarchyEntityModal({ entityType, mode = 'create', existingNode, parentId, parentType, orgId, onClose }: Props) {
  const isEdit = mode === 'edit' && !!existingNode;

  const [name, setName] = useState(isEdit ? existingNode.name : '');
  const [slug, setSlug] = useState(isEdit ? (existingNode.meta?.slug as string ?? '') : '');
  const [description, setDescription] = useState(isEdit ? (existingNode.description ?? '') : '');
  const [website, setWebsite] = useState(isEdit ? (existingNode.meta?.website as string ?? '') : '');
  const [status, setStatus] = useState(isEdit ? (existingNode.meta?.status as string ?? 'not_started') : 'not_started');
  const [priority, setPriority] = useState(isEdit ? (existingNode.meta?.priority as string ?? 'medium') : 'medium');
  const [dueDate, setDueDate] = useState(isEdit ? (existingNode.meta?.due_date as string ?? '') : '');

  // Auto-generate slug from name for orgs
  useEffect(() => {
    if (!isEdit && entityType === 'organization' && name) {
      setSlug(name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  }, [name, isEdit, entityType]);

  const createOrg = useCreateOrganization();
  const createWs = useCreateWorkspace();
  const createProj = useCreateProject();
  const createTask = useCreateTask();
  const updateEntity = useUpdateEntity();

  const isPending = createOrg.isPending || createWs.isPending || createProj.isPending || createTask.isPending || updateEntity.isPending;

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    const opts = { onSuccess: () => onClose() };

    if (isEdit && existingNode) {
      const nameField = entityType === 'task' ? 'title' : 'name';
      const data: Record<string, unknown> = {
        [nameField]: name.trim(),
        description: description || null,
      };

      if (entityType === 'organization') {
        // slug is immutable after creation for orgs
      }
      if (entityType === 'task') {
        data.status = status;
        data.priority = priority;
        data.due_date = dueDate || null;
      }

      updateEntity.mutate({ type: entityType, id: existingNode.id, data }, opts);
      return;
    }

    // Create mode
    switch (entityType) {
      case 'organization':
        createOrg.mutate(
          { name: name.trim(), slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), description: description || undefined },
          opts
        );
        break;

      case 'workspace':
        if (!orgId && !parentId) return;
        createWs.mutate(
          {
            name: name.trim(),
            organization_id: orgId ?? parentId!,
            parent_workspace_id: parentType === 'workspace' ? parentId : undefined,
            description: description || undefined,
          },
          opts
        );
        break;

      case 'project':
        createProj.mutate(
          {
            name: name.trim(),
            workspace_id: parentType === 'workspace' ? parentId : undefined,
            organization_id: parentType === 'organization' ? parentId : orgId,
            description: description || undefined,
          },
          opts
        );
        break;

      case 'task':
        if (!parentId) return;
        createTask.mutate(
          {
            title: name.trim(),
            project_id: parentType === 'task' ? '' : parentId,
            parent_task_id: parentType === 'task' ? parentId : undefined,
            description: description || undefined,
            status,
            priority,
          },
          opts
        );
        break;
    }
  }, [entityType, name, slug, description, status, priority, dueDate, website, parentId, parentType, orgId, onClose, isEdit, existingNode, createOrg, createWs, createProj, createTask, updateEntity]);

  const Icon = ICONS[entityType];
  const label = LABELS[entityType];
  const nameLabel = entityType === 'task' ? 'Title' : 'Name';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4" />
            {isEdit ? `Edit ${label}` : `Create ${label}`}
          </DialogTitle>
          {!isEdit && (
            <DialogDescription className="text-xs">
              {entityType === 'organization' && 'Organizations are the top-level container for all your work.'}
              {entityType === 'workspace' && 'Workspaces group related projects — often by client, department, or domain.'}
              {entityType === 'project' && 'Projects are bounded efforts with goals and deliverables.'}
              {entityType === 'task' && 'Tasks are individual units of work within a project.'}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">{nameLabel}</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={
                entityType === 'organization' ? 'e.g. Titanium Marketing'
                : entityType === 'workspace' ? 'e.g. Cosmetic Injectables Medspa'
                : entityType === 'project' ? 'e.g. Service Page Overhaul'
                : 'e.g. Research Medical Content Best Practices'
              }
              className="h-8 text-xs"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && entityType !== 'task') handleSubmit(); }}
            />
          </div>

          {/* Slug — orgs only, create mode */}
          {entityType === 'organization' && !isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs">Slug</Label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="auto-generated-from-name"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">URL-friendly identifier. Must be unique.</p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="text-xs min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          {/* Task-specific fields */}
          {entityType === 'task' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? 'Saving...' : isEdit ? `Save ${label}` : `Create ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
