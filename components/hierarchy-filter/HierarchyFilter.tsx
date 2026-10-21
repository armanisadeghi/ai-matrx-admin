'use client';

import { ReactNode } from 'react';
import { RotateCcw, Search, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@ai-matrx/design-system';
import { Button, ControlRow, SearchField } from '@ai-matrx/design-system/controls';
import { HierarchyFilterPill, type FilterOption } from './HierarchyFilterPill';
import type { UseHierarchyFilterReturn } from './types';

interface HierarchyFilterProps {
  filter: UseHierarchyFilterReturn;
  className?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onNewClick?: () => void;
  newLabel?: string;
  onNewOrg?: () => void;
  onNewProject?: () => void;
  trailing?: ReactNode;
}

export function HierarchyFilter({
  filter,
  className,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onNewClick,
  newLabel = 'New',
  onNewOrg,
  onNewProject,
  trailing,
}: HierarchyFilterProps) {
  const {
    isLoading,
    selectedOrgId,
    selectedProjectId,
    filteredOrgs,
    filteredProjects,
    selectOrg,
    selectProject,
    resetAll,
  } = filter;

  const hasSelection = selectedOrgId || selectedProjectId;
  const showSearch = onSearchChange !== undefined;

  if (isLoading && !filter.data) {
    return (
      <div className={className /* no frame: the controls draw their own borders (Arman 2026-10-21) */}>
        <ControlRow nowrap>
          <Skeleton className="h-6 w-[100px] rounded-full" />
          <Skeleton className="h-6 w-[90px] rounded-full" />
          {showSearch && <Skeleton className="h-6 flex-1 min-w-[120px] rounded-full" />}
        </ControlRow>
      </div>
    );
  }

  const orgOptions: FilterOption[] = filteredOrgs.map(org => ({
    id: org.id,
    label: org.name,
    count: org.project_count,
  }));

  const projectOptions: FilterOption[] = filteredProjects.map(project => ({
    id: project.id,
    label: project.name,
    count: project.topic_count,
  }));

  return (
    <div className={className /* no frame: the controls draw their own borders (Arman 2026-10-21) */}>
    <ControlRow nowrap>
      <HierarchyFilterPill
        label="Org"
        allLabel="All Orgs"
        options={orgOptions}
        selectedId={selectedOrgId}
        onSelect={selectOrg}
        onNew={onNewOrg}
        newLabel="New Organization"
        loading={isLoading}
      />

      <span className="text-muted-foreground/30 text-[10px] select-none">/</span>

      <HierarchyFilterPill
        label="Project"
        allLabel="All Projects"
        options={projectOptions}
        selectedId={selectedProjectId}
        onSelect={selectProject}
        onNew={onNewProject}
        newLabel="New Project"
        loading={isLoading}
      />

      {hasSelection && (
        <Button
          variant="quiet"
          onClick={resetAll}
          aria-label="Reset filters"
          icon={<RotateCcw />}
        />
      )}

      {showSearch && (
        <>
          <div className="w-px h-4 bg-border/30 mx-0.5" />
          <SearchField
            className="flex-1 min-w-0"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            end={
              searchValue ? (
                <Button
                  variant="quiet"
                  removes
                  onClick={() => onSearchChange?.('')}
                  aria-label="Clear search"
                  icon={<X />}
                />
              ) : undefined
            }
          />
        </>
      )}

      {trailing}

      {onNewClick && (
        <Button variant="primary" onClick={onNewClick} icon={<Plus />}>
          <span className="hidden sm:inline">{newLabel}</span>
        </Button>
      )}
    </ControlRow>
    </div>
  );
}
