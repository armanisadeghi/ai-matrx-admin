'use client';

import React from 'react';
import {
  MoreVertical,
  Inbox,
  CheckCircle,
  AlertCircle,
  Layers,
  ArrowUpDown,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import { TaskFilterType } from '@/features/tasks/types';
import { TaskSortField } from '@/features/tasks/types/sort';

type TaskSortOption = `${TaskSortField}-${'asc' | 'desc'}` | 'title-asc' | 'title-desc' | 'due-date-asc' | 'due-date-desc' | 'priority-asc' | 'priority-desc' | 'created-asc' | 'created-desc';
import { Button } from '@/components/ui/ButtonMine';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import MobileProjectSelector from './MobileProjectSelector';

const Circle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export default function MobileFilterMenu() {
  const {
    filter,
    setFilter,
    showCompleted,
    setShowCompleted,
    sortBy,
    setSortBy,
    showAllProjects,
    setShowAllProjects,
    activeProject,
    setActiveProject,
  } = useTaskContext();

  const [showProjectSheet, setShowProjectSheet] = React.useState(false);

  const getFilterIcon = (filterType: TaskFilterType) => {
    switch (filterType) {
      case 'all':
        return <Inbox size={18} />;
      case 'incomplete':
        return <Circle size={18} />;
      case 'overdue':
        return <AlertCircle size={18} />;
    }
  };

  const getSortLabel = (sort: TaskSortOption) => {
    const labels: Partial<Record<TaskSortOption, string>> = {
      'due-date-asc': 'Due Date (Earliest)',
      'due-date-desc': 'Due Date (Latest)',
      'priority-desc': 'Priority (High to Low)',
      'priority-asc': 'Priority (Low to High)',
      'created-desc': 'Created (Newest)',
      'created-asc': 'Created (Oldest)',
      'title-asc': 'Title (A-Z)',
      'title-desc': 'Title (Z-A)',
    };
    return labels[sort] || sort;
  };

  const handleFilterSelect = (filterType: TaskFilterType) => {
    setFilter(filterType);
    if (filterType !== 'all' && !showAllProjects && !activeProject) {
      setShowAllProjects(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* View/Filter Section */}
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              setShowAllProjects(true);
              setFilter('all');
            }}
            className={showAllProjects && filter === 'all' ? 'bg-primary/10' : ''}
          >
            <Layers size={18} className="mr-2" />
            All Tasks
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowProjectSheet(true)}>
            <Layers size={18} className="mr-2" />
            Select Project
            <ChevronRight size={16} className="ml-auto" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Filter Section */}
          <DropdownMenuLabel>Filter</DropdownMenuLabel>
          {(['all', 'incomplete', 'overdue'] as TaskFilterType[]).map((filterType) => (
            <DropdownMenuItem
              key={filterType}
              onClick={() => handleFilterSelect(filterType)}
              className={filter === filterType ? 'bg-primary/10' : ''}
            >
              {getFilterIcon(filterType)}
              <span className="ml-2 capitalize">{filterType}</span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Sort Section */}
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowUpDown size={18} className="mr-2" />
              {getSortLabel(sortBy as TaskSortOption)}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {(
                [
                  'due-date-asc',
                  'due-date-desc',
                  'priority-desc',
                  'priority-asc',
                  'created-desc',
                  'created-asc',
                  'title-asc',
                  'title-desc',
                ] as TaskSortOption[]
              ).map((sort) => {
                // Extract field from TaskSortOption (e.g., 'priority-asc' -> 'priority')
                const field = sort.split('-')[0] === 'due' ? 'dueDate' : 
                             sort.split('-')[0] === 'priority' ? 'priority' :
                             sort.split('-')[0] === 'created' ? 'created' :
                             sort.split('-')[0] === 'title' ? 'title' : 'lastUpdated';
                
                return (
                  <DropdownMenuItem
                    key={sort}
                    onClick={() => {
                      // @ts-ignore - COMPLEX: setSortBy expects TaskSortField but receives TaskSortOption, may need refactor
                      setSortBy(field as TaskSortField);
                    }}
                    // @ts-ignore - COMPLEX: Comparison between TaskSortField and TaskSortOption types
                    className={sortBy === field ? 'bg-primary/10' : ''}
                  >
                    {getSortLabel(sort)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Display Options */}
          <DropdownMenuLabel>Display</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowCompleted(!showCompleted)}>
            {showCompleted ? <Eye size={18} className="mr-2" /> : <EyeOff size={18} className="mr-2" />}
            {showCompleted ? 'Hide' : 'Show'} Completed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Project Selector Sheet */}
      <Sheet open={showProjectSheet} onOpenChange={setShowProjectSheet}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Select Project</SheetTitle>
            <SheetDescription>Choose a project to view its tasks</SheetDescription>
          </SheetHeader>
          <MobileProjectSelector
            selectedProjectId={activeProject}
            onSelectProject={(projectId) => {
              if (projectId) {
                setActiveProject(projectId);
                setShowAllProjects(false);
              }
              setShowProjectSheet(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

