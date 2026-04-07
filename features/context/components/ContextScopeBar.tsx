'use client';

import { Building2, FolderKanban, ListTodo, User, ChevronRight } from 'lucide-react';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import type { ContextScopeLevel } from '../types';
import type { ScopeState } from '../hooks/useContextScope';
import { useAncestors } from '../hooks/useHierarchy';
import type { HierarchyNodeType } from '../service/hierarchyService';

const SCOPE_ICONS: Record<ContextScopeLevel, React.ComponentType<{ className?: string }>> = {
  user: User,
  organization: Building2,
  project: FolderKanban,
  task: ListTodo,
};

const ACCENT: Record<ContextScopeLevel, string> = {
  user: 'text-blue-500',
  organization: 'text-violet-500',
  project: 'text-amber-500',
  task: 'text-sky-500',
};

type Props = {
  scope: ScopeState;
  onScopeChange: (scope: ScopeState) => void;
};

export function ContextScopeBar({ scope, onScopeChange }: Props) {
  const { data: ancestors } = useAncestors(scope.scopeType as HierarchyNodeType, scope.scopeId === 'default' ? null : scope.scopeId);

  // Build breadcrumb chain
  const chain = ancestors && ancestors.length > 0
    ? ancestors
    : [{ type: scope.scopeType as HierarchyNodeType, id: scope.scopeId, name: scope.scopeName }];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="/ssr/context"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={e => {
              e.preventDefault();
              onScopeChange({ scopeType: 'user', scopeId: 'default', scopeName: 'My Context' });
            }}
          >
            Context
          </BreadcrumbLink>
        </BreadcrumbItem>

        {chain.map((crumb, idx) => {
          const Icon = SCOPE_ICONS[crumb.type as ContextScopeLevel];
          const accent = ACCENT[crumb.type as ContextScopeLevel];
          const isLast = idx === chain.length - 1;

          return (
            <span key={`${crumb.type}-${crumb.id}`} className="contents">
              <BreadcrumbSeparator>
                <ChevronRight className="h-3 w-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-xs flex items-center gap-1">
                    <Icon className={`h-3 w-3 ${accent}`} />
                    <span className="font-medium">{crumb.name}</span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href="#"
                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={e => {
                      e.preventDefault();
                      onScopeChange({
                        scopeType: crumb.type as ContextScopeLevel,
                        scopeId: crumb.id,
                        scopeName: crumb.name,
                      });
                    }}
                  >
                    <Icon className={`h-3 w-3 ${accent}`} />
                    {crumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
