'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { ContextScopeLevel } from '../types';

export type ScopeState = {
  scopeType: ContextScopeLevel;
  scopeId: string;
  scopeName: string;
};

const DEFAULT_SCOPE: ScopeState = {
  scopeType: 'user',
  scopeId: 'default',
  scopeName: 'My Context',
};

export function useContextScope(): {
  scope: ScopeState;
  setScope: (scope: ScopeState) => void;
  scopeLabel: string;
} {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const scopeType = (searchParams.get('scopeType') as ContextScopeLevel) || DEFAULT_SCOPE.scopeType;
  const scopeId = searchParams.get('scopeId') || DEFAULT_SCOPE.scopeId;
  const scopeName = searchParams.get('scopeName') || DEFAULT_SCOPE.scopeName;

  const scope: ScopeState = { scopeType, scopeId, scopeName };

  const setScope = useCallback(
    (newScope: ScopeState) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('scopeType', newScope.scopeType);
      params.set('scopeId', newScope.scopeId);
      params.set('scopeName', newScope.scopeName);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const scopeLabel = scopeType === 'user' ? 'Personal'
    : scopeType === 'organization' ? 'Organization'
    : scopeType === 'workspace' ? 'Workspace'
    : scopeType === 'project' ? 'Project'
    : 'Task';

  return { scope, setScope, scopeLabel };
}
