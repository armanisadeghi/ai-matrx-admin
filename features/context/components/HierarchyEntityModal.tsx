'use client';

import { useState, useCallback } from 'react';
import { Building2, Users, FolderKanban, ListTodo } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  useCreateOrganization,
  useCreateWorkspace,
  useCreateProject,
  useCreateTask,
} from '../hooks/useHierarchy';
import type { HierarchyNodeType } from '../service/hierarchyService';

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

type Props = {
  entityType: HierarchyNodeType;
  parentId?: string;
  parentType?: HierarchyNodeType;
  orgId?: string;
  onClose: () => void;
};

export function HierarchyEntityModal({ entityType, parentId, parentType, orgId, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createOrg = useCreateOrganization();
  const createWs = useCreateWorkspace();
  const createProj = useCreateProject();
  const createTask = useCreateTask();

  const isPending = createOrg.isPending || createWs.isPending || createProj.isPending || createTask.isPending;

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;

    const opts = { onSuccess: () => onClose() };

    switch (entityType) {
      case 'organization':
        createOrg.mutate(
          { name: name.trim(), slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), description: description || undefined },
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
            project_id: parentType === 'task' ? '' : parentId, // for subtasks we'd need the project_id lookup
            parent_task_id: parentType === 'task' ? parentId : undefined,
            description: description || undefined,
          },
          opts
        );
        break;
    }
  }, [entityType, name, description, parentId, parentType, orgId, onClose, createOrg, createWs, createProj, createTask]);

  const Icon = ICONS[entityType];
  const label = LABELS[entityType];
  const nameLabel = entityType === 'task' ? 'Title' : 'Name';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4" />
            Create {label}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {entityType === 'organization' && 'Organizations are the top-level container for all your work.'}
            {entityType === 'workspace' && 'Workspaces group related projects — often by client, department, or domain.'}
            {entityType === 'project' && 'Projects are bounded efforts with goals and deliverables.'}
            {entityType === 'task' && 'Tasks are individual units of work within a project.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
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
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>

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
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? 'Creating...' : `Create ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
