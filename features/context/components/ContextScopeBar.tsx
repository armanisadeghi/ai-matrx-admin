'use client';

import { Building2, Users, Briefcase, FolderKanban, ListTodo, User } from 'lucide-react';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import type { ContextScopeLevel } from '../types';
import type { ScopeState } from '../hooks/useContextScope';

const SCOPE_ICONS: Record<ContextScopeLevel, React.ComponentType<{ className?: string }>> = {
  user: User,
  organization: Building2,
  workspace: Users,
  project: FolderKanban,
  task: ListTodo,
};

const SCOPE_LABELS: Record<ContextScopeLevel, string> = {
  user: 'Personal',
  organization: 'Organization',
  workspace: 'Workspace',
  project: 'Project',
  task: 'Task',
};

// Demo scopes for the scope picker
const DEMO_SCOPES: ScopeState[] = [
  { scopeType: 'user', scopeId: 'default', scopeName: 'My Context' },
  { scopeType: 'organization', scopeId: 'org-1', scopeName: 'Acme Corp' },
  { scopeType: 'workspace', scopeId: 'ws-1', scopeName: 'SEO Team' },
  { scopeType: 'project', scopeId: 'proj-1', scopeName: 'Q1 Campaign' },
];

type Props = {
  scope: ScopeState;
  onScopeChange: (scope: ScopeState) => void;
};

export function ContextScopeBar({ scope, onScopeChange }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = SCOPE_ICONS[scope.scopeType];

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{SCOPE_LABELS[scope.scopeType]}:</span>
            <span className="font-medium">{scope.scopeName}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-1.5">Switch scope</p>
          {DEMO_SCOPES.map(s => {
            const SIcon = SCOPE_ICONS[s.scopeType];
            const isActive = s.scopeId === scope.scopeId && s.scopeType === scope.scopeType;
            return (
              <button
                key={`${s.scopeType}-${s.scopeId}`}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                onClick={() => {
                  onScopeChange(s);
                  setOpen(false);
                }}
              >
                <SIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.scopeName}</p>
                  <p className="text-[10px] text-muted-foreground">{SCOPE_LABELS[s.scopeType]}</p>
                </div>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ssr/context" className="text-xs">Context</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs">{scope.scopeName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
