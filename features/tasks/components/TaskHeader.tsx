import React from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  selectShowAllProjects,
  selectActiveProject,
  selectProjects,
} from '@/features/tasks/redux';

export default function TaskHeader() {
  const showAllProjects = useAppSelector(selectShowAllProjects);
  const activeProject = useAppSelector(selectActiveProject);
  const projects = useAppSelector(selectProjects);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-border p-4">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
        {showAllProjects
          ? 'All Tasks'
          : projects.find((project) => project.id === activeProject)?.name ||
            'Tasks'}
      </h1>
    </header>
  );
}
