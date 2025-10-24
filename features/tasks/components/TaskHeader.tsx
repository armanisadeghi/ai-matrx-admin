import React from 'react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';

export default function TaskHeader() {
  const { showAllProjects, activeProject, projects } = useTaskContext();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
        {showAllProjects 
          ? 'All Tasks' 
          : (projects.find(project => project.id === activeProject)?.name || 'Tasks')}
      </h1>
    </header>
  );
}
